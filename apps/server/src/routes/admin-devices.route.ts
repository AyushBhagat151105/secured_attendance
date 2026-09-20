import { Elysia, t } from "elysia";
import { requireRole, authMacro } from "../middlewares/guards";
import { AdminDevicesService } from "../services/admin-devices.service";

export const adminDevicesModule = new Elysia({ prefix: "/devices" })
  .use(requireRole(["admin", "super_admin"]))
  .use(authMacro)

  // GET /api/admin/devices/rebind-requests
  .get(
    "/rebind-requests",
    async ({ query }: any) => {
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      return AdminDevicesService.listRebindRequests({
        status: query.status,
        search: query.search,
        page,
        limit,
      });
    },
    {
      requireAuth: true,
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // POST /api/admin/devices/rebind-requests/:id/approve
  .post(
    "/rebind-requests/:id/approve",
    async ({ params, user, status, server }: any) => {
      const result = await AdminDevicesService.approveRebindRequest(params.id, user.id, server);
      if (!result.success) {
        switch (result.error) {
          case "NOT_FOUND":
            return status(404, { message: result.message });
          default:
            return status(400, { message: result.message });
        }
      }
      return result;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  // POST /api/admin/devices/rebind-requests/:id/reject
  .post(
    "/rebind-requests/:id/reject",
    async ({ params, body, user, status, server }: any) => {
      const result = await AdminDevicesService.rejectRebindRequest(
        params.id,
        user.id,
        body?.note,
        server,
      );
      if (!result.success) {
        switch (result.error) {
          case "NOT_FOUND":
            return status(404, { message: result.message });
          default:
            return status(400, { message: result.message });
        }
      }
      return result;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Optional(
        t.Object({
          note: t.Optional(t.String()),
        }),
      ),
    },
  )

  // GET /api/admin/devices/inventory
  .get(
    "/inventory",
    async ({ query }: any) => {
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      return AdminDevicesService.listInventory({
        boundStatus: query.boundStatus,
        search: query.search,
        page,
        limit,
      });
    },
    {
      requireAuth: true,
      query: t.Object({
        boundStatus: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // POST /api/admin/devices/batch-rebind
  .post(
    "/batch-rebind",
    async ({ body, user, status, server }: any) => {
      const result = await AdminDevicesService.batchResetDevices(
        body.studentProfileIds,
        user.id,
        server,
      );
      if (!result.success) {
        return status(400, { message: result.message });
      }
      return result;
    },
    {
      requireAuth: true,
      body: t.Object({
        studentProfileIds: t.Array(t.String()),
      }),
    },
  )

  // POST /api/admin/devices/:studentProfileId/rebind
  .post(
    "/:studentProfileId/rebind",
    async ({ params, user, status, server }: any) => {
      const result = await AdminDevicesService.resetStudentDevice(
        params.studentProfileId,
        user.id,
        server,
      );
      if (!result.success) {
        return status(404, { message: result.message });
      }
      return result;
    },
    {
      requireAuth: true,
      params: t.Object({ studentProfileId: t.String() }),
    },
  );

export type AdminDevicesModule = typeof adminDevicesModule;
