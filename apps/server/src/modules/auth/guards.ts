import { auth } from "@secured_attendance/auth";
import { Elysia, status } from "elysia";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "student" | "teacher" | "admin" | "super_admin";

// ─── Auth Macro Plugin ────────────────────────────────────────────────────────

/**
 * `authMacro` — named plugin (deduplicated) that exposes a `requireAuth` macro.
 *
 * Using `.macro()` with `resolve` injects `user` and `session` into the handler
 * context with full type safety — the correct Elysia pattern for auth.
 */
export const authMacro = new Elysia({ name: "auth-macro" })
  .macro({
    requireAuth: {
      resolve: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          throw status(401, { message: "Unauthorized" });
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

// ─── Role Guard Plugin ────────────────────────────────────────────────────────

/**
 * Convenience function: returns an Elysia plugin that enforces role-based access.
 * Uses `onBeforeHandle` so it blocks unauthenticated/unauthorised requests before
 * any route handler runs.
 *
 * @example
 * export const adminUsersModule = new Elysia({ prefix: '/users' })
 *   .use(requireRole(['admin', 'super_admin']))
 *   .get('/', handler)
 */
export function requireRole(roles: UserRole[]) {
  return new Elysia({ name: `require-role-${roles.join("-")}` })
    .onBeforeHandle(async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const role = (session.user as { role?: string }).role as UserRole | undefined;

      if (!role || !roles.includes(role)) {
        return status(403, { message: "Forbidden" });
      }
    });
}
