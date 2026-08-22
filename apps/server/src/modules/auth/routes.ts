import { Elysia, t } from "elysia";
import { authMacro } from "./guards";
import prisma from "@secured_attendance/db";
import { logger } from "../../lib/logger";

export const authModule = new Elysia({ prefix: "/api/auth-custom" })
  .use(authMacro)
  .patch("/complete-onboarding", async ({ user, status }) => {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { requiresPasswordChange: false } as any,
      });
      return { success: true };
    } catch (err) {
      logger.error("Failed to complete onboarding", { err, userId: user.id });
      return status(500, { message: "Internal Server Error" });
    }
  }, { requireAuth: true })
  .post("/device-bind", async ({ user, body, status }) => {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return status(404, { message: "Student profile not found" });
      }

      if (profile.deviceBound && profile.deviceId !== body.deviceId) {
        return status(403, { message: "Account already bound to another device. Contact admin." });
      }

      await prisma.studentProfile.update({
        where: { userId: user.id },
        data: {
          deviceId: body.deviceId,
          deviceModel: body.deviceName,
          deviceBound: true,
          deviceBoundAt: new Date(),
        },
      });

      return { success: true };
    } catch (err) {
      logger.error("Failed to bind device", { err, userId: user.id });
      return status(500, { message: "Internal Server Error" });
    }
  }, {
    requireAuth: true,
    body: t.Object({
      deviceId: t.String(),
      deviceName: t.String(),
    }),
  });
