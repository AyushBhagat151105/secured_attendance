import prisma from "@secured_attendance/db";
import { Elysia, t } from "elysia";

import { logger } from "../../lib/logger";
import { requireRole } from "../auth/guards";

// ─── Validation Models ────────────────────────────────────────────────────────

export const CreateUserBody = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
  role: t.Union([
    t.Literal("student"),
    t.Literal("teacher"),
    t.Literal("admin"),
    t.Literal("super_admin"),
  ]),
});

export const UpdateUserBody = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  role: t.Optional(
    t.Union([
      t.Literal("student"),
      t.Literal("teacher"),
      t.Literal("admin"),
      t.Literal("super_admin"),
    ]),
  ),
  status: t.Optional(
    t.Union([t.Literal("active"), t.Literal("suspended"), t.Literal("pending")]),
  ),
});

export const UsersListQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  role: t.Optional(
    t.Union([
      t.Literal("student"),
      t.Literal("teacher"),
      t.Literal("admin"),
      t.Literal("super_admin"),
      t.Literal(""),
    ]),
  ),
  search: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal("active"),
      t.Literal("suspended"),
      t.Literal("pending"),
      t.Literal(""),
    ]),
  ),
});

// ─── Route Handler ────────────────────────────────────────────────────────────

export const adminUsersModule = new Elysia({ prefix: "/users" })
  .use(requireRole(["admin", "super_admin"]))

  // GET /api/admin/users — list users with pagination + filtering
  .get(
    "/",
    async ({ query, status }) => {
      try {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where = {
          ...(query.role ? { role: query.role } : {}),
          ...(query.status
            ? {
                OR: [
                  { studentProfile: { status: query.status } },
                ],
              }
            : {}),
          ...(query.search
            ? {
                OR: [
                  { name: { contains: query.search, mode: "insensitive" as const } },
                  { email: { contains: query.search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        };

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              image: true,
              studentProfile: {
                select: {
                  enrollmentNo: true,
                  status: true,
                  deviceBound: true,
                  deviceModel: true,
                  programCode: true,
                },
              },
              teacherProfile: {
                select: {
                  code: true,
                  department: true,
                },
              },
            },
          }),
          prisma.user.count({ where }),
        ]);

        return {
          users,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (err) {
        logger.error("Failed to list users", { err });
        return status(500, { message: "Failed to list users" });
      }
    },
    { query: UsersListQuery },
  )

  // GET /api/admin/users/:id — get single user
  .get(
    "/:id",
    async ({ params, status }) => {
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
          studentProfile: {
            select: {
              enrollmentNo: true,
              status: true,
              deviceBound: true,
              deviceModel: true,
              deviceOs: true,
              deviceBoundAt: true,
              biometricEnabled: true,
              programCode: true,
              admissionYear: true,
              rollNumber: true,
            },
          },
          teacherProfile: {
            select: {
              code: true,
              department: true,
            },
          },
        },
      });

      if (!user) {
        return status(404, { message: "User not found" });
      }

      return user;
    },
    { params: t.Object({ id: t.String() }) },
  )

  // PATCH /api/admin/users/:id — update user fields
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      const existing = await prisma.user.findUnique({ where: { id: params.id } });
      if (!existing) {
        return status(404, { message: "User not found" });
      }

      const updateData: Record<string, unknown> = {};
      if (body.name) updateData.name = body.name;
      if (body.role) updateData.role = body.role;

      const user = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Handle status update on studentProfile
      if (body.status && existing.role === "student") {
        await prisma.studentProfile.updateMany({
          where: { userId: params.id },
          data: { status: body.status },
        });
      }

      logger.info("User updated", { userId: params.id, changes: body });
      return user;
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateUserBody,
    },
  )

  // DELETE /api/admin/users/:id — suspend (soft delete)
  .delete(
    "/:id",
    async ({ params, status }) => {
      const existing = await prisma.user.findUnique({ where: { id: params.id } });
      if (!existing) {
        return status(404, { message: "User not found" });
      }

      // Soft-delete: set student status to suspended
      if (existing.role === "student") {
        await prisma.studentProfile.updateMany({
          where: { userId: params.id },
          data: { status: "suspended" },
        });
      }

      logger.info("User suspended", { userId: params.id });
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) },
  )

  // POST /api/admin/users/:id/device-rebind — reset student device binding
  .post(
    "/:id/device-rebind",
    async ({ params, status }) => {
      const profile = await prisma.studentProfile.findFirst({
        where: { userId: params.id },
      });

      if (!profile) {
        return status(404, { message: "Student profile not found" });
      }

      await prisma.studentProfile.update({
        where: { userId: params.id },
        data: {
          deviceId: null,
          deviceModel: null,
          deviceOs: null,
          deviceBound: false,
          deviceBoundAt: null,
          biometricEnabled: false,
        },
      });

      logger.info("Device rebound by admin", { userId: params.id });
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
