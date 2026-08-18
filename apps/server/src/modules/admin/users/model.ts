import { t } from "elysia";

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

export const CreateTeacherBody = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: "email" }),
  teacherCode: t.String({ minLength: 2 }),
  department: t.Optional(t.String()),
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

export const UserIdParam = t.Object({ id: t.String() });

export type CreateUserType = typeof CreateUserBody.static;
export type CreateTeacherType = typeof CreateTeacherBody.static;
export type UpdateUserType = typeof UpdateUserBody.static;
export type UsersListQueryType = typeof UsersListQuery.static;
export type UserIdParamType = typeof UserIdParam.static;
