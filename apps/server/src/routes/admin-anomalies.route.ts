import { Elysia, t, status } from "elysia";
import { requireRole } from "../middlewares/guards";
import prisma from "@secured_attendance/db";

export const adminAnomaliesModule = new Elysia({ prefix: "/anomalies" })
  .use(requireRole(["admin", "super_admin"]))
  .get(
    "/",
    async ({ query }) => {
      const statusValue = query.status as string | undefined;

      const anomalies = await prisma.anomalyAlert.findMany({
        where: statusValue ? { status: statusValue } : undefined,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return anomalies;
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
      }),
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
  );
