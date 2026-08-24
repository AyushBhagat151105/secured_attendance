import { Elysia, t } from "elysia";
import { requireRole } from "../middlewares/guards";
import prisma from "@secured_attendance/db";

export const adminAuditModule = new Elysia({ prefix: "/audit-logs" })
  .use(requireRole(["admin", "super_admin"]))
  .get(
    "/",
    async ({ query }) => {
      const { limit = 50, offset = 0, eventType, actor } = query;

      const where: any = {};
      if (eventType) where.eventType = eventType;
      if (actor) where.actor = actor;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { timestamp: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Numeric({ default: 50 })),
        offset: t.Optional(t.Numeric({ default: 0 })),
        eventType: t.Optional(t.String()),
        actor: t.Optional(t.String()),
      }),
    },
  );
