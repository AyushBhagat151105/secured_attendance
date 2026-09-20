import { auth } from "@secured_attendance/auth";
import { Elysia, status } from "elysia";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "student" | "teacher" | "admin" | "super_admin";

// ─── High-Performance Session Memoization & Cache ──────────────────────────────
interface CachedSessionEntry {
  session: any;
  expiresAt: number;
}

const serverSessionCache = new Map<string, CachedSessionEntry>();
const SESSION_CACHE_TTL_MS = 10_000; // 10s burst cache for parallel frontend queries

export function clearSessionCache() {
  serverSessionCache.clear();
}

/**
 * Resolves session from Better-Auth with:
 * 1. Per-request promise deduplication (ensures 1 DB lookup per request max)
 * 2. 10-second in-memory burst cache (prevents parallel requests from hammering NeonDB)
 */
export async function getSessionFromRequest(request: Request) {
  const req = request as any;
  if (req._sessionPromise) {
    return req._sessionPromise;
  }

  req._sessionPromise = (async () => {
    const authKey =
      request.headers.get("x-test-user-id") ||
      request.headers.get("authorization") ||
      request.headers.get("cookie");

    const now = Date.now();
    if (authKey) {
      const cached = serverSessionCache.get(authKey);
      if (cached && cached.expiresAt > now) {
        return cached.session;
      }
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (authKey && session) {
      // Bound cache size
      if (serverSessionCache.size > 2000) {
        for (const [k, v] of serverSessionCache.entries()) {
          if (v.expiresAt <= now) serverSessionCache.delete(k);
        }
      }
      serverSessionCache.set(authKey, { session, expiresAt: now + SESSION_CACHE_TTL_MS });
    }

    return session;
  })();

  return req._sessionPromise;
}

// ─── Auth Macro Plugin ────────────────────────────────────────────────────────

/**
 * `requireAuth` — standard Elysia middleware (plugin) using `.derive`.
 *
 * Using `.derive()` is the most robust way to inject `user` and `session` into the handler
 * context with perfect type inference in Elysia.
 */
export const authMacro = new Elysia({ name: "auth-macro" })
  .macro({
    requireAuth: (enabled: boolean) => {
      if (!enabled) return;
      return {
        beforeHandle: async ({ request }) => {
          const session = await getSessionFromRequest(request);
          if (!session) {
            return status(401, { message: "Unauthorized" });
          }
        },
        resolve: async ({ request }) => {
          const session = await getSessionFromRequest(request);
          return {
            user: session?.user,
            session: session?.session,
          };
        },
      };
    },
  })
  .as("scoped");

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
      const session = await getSessionFromRequest(request);

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const role = (session.user as { role?: string }).role as UserRole | undefined;

      if (!role || !roles.includes(role)) {
        return status(403, { message: "Forbidden" });
      }
    })
    .as("scoped");
}
