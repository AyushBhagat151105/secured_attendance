import { auth } from "@secured_attendance/auth";
import { Elysia, status } from "elysia";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "student" | "teacher" | "admin" | "super_admin";

// ─── Auth Macro Plugin ────────────────────────────────────────────────────────

/**
 * `requireAuth` — standard Elysia middleware (plugin) using `.derive`.
 *
 * Using `.derive()` is the most robust way to inject `user` and `session` into the handler
 * context with perfect type inference in Elysia.
 */
export const authMacro = new Elysia({ name: "auth-macro" })
  .macro({
    requireAuth: {
      resolve: async ({ request, status }) => {
        // --- DEBUG LOGGING ---
        console.log("==========================================");
        console.log("[DEBUG] Incoming Request URL:", request.url);
        console.log("[DEBUG] Incoming Headers:", Object.fromEntries(request.headers.entries()));
        
        const session = await auth.api.getSession({ headers: request.headers });
        
        console.log("[DEBUG] getSession Result:", session ? `User Found: ${session.user.email}` : "NULL");
        console.log("==========================================");
        // ---------------------

        if (!session) {
          throw status(401, { message: "Unauthorized", debug_headers: Object.fromEntries(request.headers.entries()) });
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
