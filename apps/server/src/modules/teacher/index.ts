import { Elysia, status, t } from "elysia";
import { requireRole } from "../auth/guards";
import { TeacherService } from "./service";
import { CreateSessionBody } from "./model";
import { auth } from "@secured_attendance/auth";
import prisma from "@secured_attendance/db";
import crypto from "crypto";
import { logger } from "../../lib/logger";

// A map to store active WebSocket intervals
const activeTimers = new Map<string, ReturnType<typeof setInterval>>();

export const teacherModule = new Elysia({ prefix: "/api/teacher" })
  .use(requireRole(["teacher"]))
  
  // REST ENDPOINTS
  .get("/schedule/today", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    return TeacherService.getDashboardData(session.user.id);
  })
  
  .post("/sessions", async ({ request, body }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    return TeacherService.startSession(session.user.id, body.timetableEntryId);
  }, { body: CreateSessionBody })
  
  .post("/sessions/:id/close", async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    return TeacherService.closeSession(session.user.id, params.id);
  })

  // WEBSOCKET GATEWAY
  .ws("/ws/sessions/:id", {
    response: t.Union([
      t.Object({
        type: t.Literal("QR_TOKENS_BATCH"),
        tokens: t.Array(
          t.Object({
            nonce: t.String(),
            expiresAt: t.Number(),
            signature: t.String(),
            activeAfter: t.Number(),
          })
        ),
        sessionId: t.String(),
      }),
      t.Object({
        type: t.Literal("ATTENDANCE_COUNT"),
        count: t.Number(),
      }),
      t.Object({
        type: t.Literal("ERROR"),
        message: t.String(),
      }),
    ]),
    async open(ws) {
      // In Elysia, `ws.data` contains request data, including headers.
      // But we can also manually pass auth token if cookies aren't sent.
      // Assuming cookies are sent automatically by browser.
      const session = await auth.api.getSession({ headers: new Headers(ws.data.headers as Record<string, string>) });
      
      if (!session || (session.user as any).role !== "teacher") {
        ws.send({ type: "ERROR", message: "Unauthorized" });
        ws.close();
        return;
      }

      const sessionId = ws.data.params.id;
      
      // Verify session belongs to this teacher and is active
      const dbSession = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: { teacherProfile: true },
      });

      if (!dbSession || dbSession.teacherProfile.userId !== session.user.id || dbSession.status !== "active") {
        ws.send({ type: "ERROR", message: "Invalid or inactive session" });
        ws.close();
        return;
      }

      logger.info("Teacher connected to WS", { sessionId });

      // Generate a single token immediately and send it
      const generateAndSendTokens = async () => {
        try {
          const tokens = [];
          for (let i = 0; i < 5; i++) {
            const nonce = crypto.randomBytes(16).toString("base64url");
            
            // Expiry: 45 seconds from generation to allow slow internet
            const expiresAt = new Date(Date.now() + 45000 + (i * 10000)); // offset each token by 10s
            
            // Calculate signature: HMAC-SHA256 of "sessionId:nonce:expiresAt.getTime()"
            const payloadString = `${sessionId}:${nonce}:${expiresAt.getTime()}`;
            const signature = crypto
              .createHmac("sha256", dbSession.sessionSecret)
              .update(payloadString)
              .digest("hex");

            tokens.push({
              nonce,
              expiresAt: expiresAt.getTime(),
              signature,
              activeAfter: Date.now() + (i * 10000) // Client knows when to show this
            });

            // Store in DB for future verification by student
            await prisma.qrToken.create({
              data: {
                sessionId,
                nonce,
                issuedAt: new Date(),
                expiresAt,
              }
            });
          }

          ws.send({ type: "QR_TOKENS_BATCH", tokens, sessionId });
        } catch (error) {
          logger.error("Failed to generate QR tokens", { error });
        }
      };

      // Send initial batch
      await generateAndSendTokens();

      // Refresh batch every 50 seconds (since we send 5 tokens x 10s)
      const timer = setInterval(generateAndSendTokens, 45000); // 45s to overlap safely
      activeTimers.set(ws.id, timer);
    },
    
    close(ws) {
      const timer = activeTimers.get(ws.id);
      if (timer) {
        clearInterval(timer);
        activeTimers.delete(ws.id);
      }
      logger.info("Teacher disconnected from WS", { sessionId: ws.data.params.id });
    }
  });

export type TeacherModule = typeof teacherModule;
