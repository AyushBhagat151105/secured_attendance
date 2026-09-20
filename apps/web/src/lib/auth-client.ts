import { env } from "@secured_attendance/env/web";
import { jwtClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [organizationClient(), jwtClient()],
});

// Fast in-memory session cache to prevent blocking HTTP calls on every client-side route navigation
let sessionCache: { data: any; expiresAt: number } | null = null;
const SESSION_CACHE_TTL_MS = 60_000; // 60 seconds

export async function getCachedSession(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && sessionCache && sessionCache.expiresAt > now) {
    return sessionCache.data;
  }
  const session = await authClient.getSession();
  if (session?.data) {
    sessionCache = { data: session.data, expiresAt: now + SESSION_CACHE_TTL_MS };
    return session.data;
  }
  sessionCache = null;
  return null;
}

export function invalidateSessionCache() {
  sessionCache = null;
}

