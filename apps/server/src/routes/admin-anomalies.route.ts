import { Elysia, t, status } from "elysia";
import { requireRole, authMacro } from "../middlewares/guards";
import prisma from "@secured_attendance/db";
import { queueAuditLog } from "../lib/audit";

export const adminAnomaliesModule = new Elysia({ prefix: "/anomalies" })
  .use(requireRole(["admin", "super_admin"]))
  .use(authMacro)
  .get(
    "/",
    async ({ query }) => {
      const {
        status: statusFilter,
        userId,
        type,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0,
      } = query;

      const where: Record<string, unknown> = {};
      if (statusFilter) where.status = statusFilter;
      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };
      }

      const [anomalies, total] = await Promise.all([
        prisma.anomalyAlert.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.anomalyAlert.count({ where }),
      ]);

      return { anomalies, total };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        type: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric({ default: 50 })),
        offset: t.Optional(t.Numeric({ default: 0 })),
      }),
    },
  )
  .get(
    "/student/:id",
    async ({ params }) => {
      const anomalies = await prisma.anomalyAlert.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: "desc" },
      });
      return anomalies;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .patch(
    "/:id/resolve",
    async ({ params }) => {
      const anomaly = await prisma.anomalyAlert.findUnique({
        where: { id: params.id },
      });
      if (!anomaly) return status(404, "Anomaly not found");

      const updated = await prisma.anomalyAlert.update({
        where: { id: params.id },
        data: { status: "RESOLVED" },
      });
      return updated;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/:id/rebind-and-resolve",
    async ({ params, user }: any) => {
      const anomaly = await prisma.anomalyAlert.findUnique({
        where: { id: params.id },
      });
      if (!anomaly) return status(404, "Anomaly not found");

      await prisma.$transaction(async (tx) => {
        if (anomaly.userId) {
          await tx.studentProfile.updateMany({
            where: { userId: anomaly.userId },
            data: {
              deviceId: null,
              deviceModel: null,
              deviceOs: null,
              deviceBound: false,
              deviceBoundAt: null,
              biometricEnabled: false,
            },
          });
        }

        await tx.anomalyAlert.update({
          where: { id: params.id },
          data: { status: "RESOLVED" },
        });
      });

      if (anomaly.userId) {
        void queueAuditLog({
          eventType: "device.rebound_from_anomaly",
          actor: user?.id || "admin",
          actorRole: "admin",
          targetId: anomaly.userId,
          details: { anomalyId: anomaly.id, anomalyType: anomaly.type },
        });
      }

      return { success: true, message: "Device rebound and anomaly resolved" };
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
    },
  );
