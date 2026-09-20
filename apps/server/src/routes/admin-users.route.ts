import { Elysia } from "elysia";
import { requireRole, authMacro } from "../middlewares/guards";
import {
  UpdateUserBody,
  UserIdParam,
  UsersListQuery,
  CreateTeacherBody,
  CreateStudentBody,
  CreateAdminBody,
  AdminChangePasswordBody,
  BulkDeleteUsersBody,
  BulkStatusUsersBody,
  BulkDivisionStudentsBody,
} from "../models/admin-users.model";
import { AdminUsersService } from "../services/admin-users.service";
import { logger } from "../lib/logger";

export const adminUsersModule = new Elysia({ prefix: "/users" })
  .use(requireRole(["admin", "super_admin"]))
  .use(authMacro)

  .get(
    "/",
    async ({ query, status }) => {
      try {
        return await AdminUsersService.listUsers(query);
      } catch (err) {
        logger.error("Failed to list users", { err });
        return status(500, { message: "Failed to list users" });
      }
    },
    { query: UsersListQuery },
  )

  .post("/bulk-delete", async ({ body, user }: any) => AdminUsersService.bulkDelete(body.userIds, user), {
    body: BulkDeleteUsersBody,
  })

  .post(
    "/bulk-status",
    async ({ body, user }: any) => AdminUsersService.bulkStatus(body.userIds, body.status, user),
    {
      body: BulkStatusUsersBody,
    },
  )

  .post(
    "/bulk-division",
    async ({ body, user }: any) =>
      AdminUsersService.bulkDivision(body.userIds, body.divisionId, user),
    {
      body: BulkDivisionStudentsBody,
    },
  )

  .get("/:id", async ({ params: { id } }) => AdminUsersService.getUser(id), { params: UserIdParam })

  .get(
    "/:id/student-detail",
    async ({ params: { id } }) => AdminUsersService.getStudentDetail(id),
    { params: UserIdParam },
  )

  .post(
    "/:id/change-password",
    async ({ params: { id }, body, user }: any) =>
      AdminUsersService.changePassword(id, body, user),
    {
      params: UserIdParam,
      body: AdminChangePasswordBody,
    },
  )

  .post("/teacher", async ({ body }) => AdminUsersService.createTeacher(body), {
    body: CreateTeacherBody,
  })

  .post("/student", async ({ body }) => AdminUsersService.createStudent(body), {
    body: CreateStudentBody,
  })

  .post("/admin", async ({ body }) => AdminUsersService.createAdmin(body), {
    body: CreateAdminBody,
  })

  .patch("/:id", async ({ params: { id }, body }) => AdminUsersService.updateUser(id, body), {
    params: UserIdParam,
    body: UpdateUserBody,
  })

  .post("/:id/suspend", async ({ params: { id } }) => AdminUsersService.suspendUser(id), {
    params: UserIdParam,
  })

  .delete("/:id", async ({ params: { id } }) => AdminUsersService.deleteUser(id), {
    params: UserIdParam,
  })

  .post("/:id/device-rebind", async ({ params: { id }, server }: any) => AdminUsersService.rebindDevice(id, server), {
    params: UserIdParam,
  });
