import { Elysia } from "elysia";
import { requireRole } from "../../auth/guards";
import { UpdateUserBody, UserIdParam, UsersListQuery, CreateTeacherBody } from "./model";
import { AdminUsersService } from "./service";
import { logger } from "../../../lib/logger";

export const adminUsersModule = new Elysia({ prefix: "/users" })
  .use(requireRole(["admin", "super_admin"]))

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

  .get(
    "/:id",
    async ({ params: { id } }) => AdminUsersService.getUser(id),
    { params: UserIdParam },
  )

  .post(
    "/teacher",
    async ({ body }) => AdminUsersService.createTeacher(body),
    { body: CreateTeacherBody },
  )

  .patch(
    "/:id",
    async ({ params: { id }, body }) => AdminUsersService.updateUser(id, body),
    {
      params: UserIdParam,
      body: UpdateUserBody,
    },
  )

  .delete(
    "/:id",
    async ({ params: { id } }) => AdminUsersService.suspendUser(id),
    { params: UserIdParam },
  )

  .post(
    "/:id/device-rebind",
    async ({ params: { id } }) => AdminUsersService.rebindDevice(id),
    { params: UserIdParam },
  );
