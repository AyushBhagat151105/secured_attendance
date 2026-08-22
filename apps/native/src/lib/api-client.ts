import type { App } from "server/src/index";

import { treaty } from "@elysiajs/eden";
import { env } from "@secured_attendance/env/native";
import { authClient } from "./auth-client";

export const apiClient = treaty<App>(env.EXPO_PUBLIC_SERVER_URL, {
  onRequest: async (path, options) => {
    // We use getCookie from Better Auth because it inherently understands
    // the Expo SecureStore chunking mechanism (unlike raw getItemAsync).
    const cookieString = await (authClient as any).getCookie();

    if (cookieString) {
      // Extract the actual token from the cookie string (format: better-auth.session_token=TOKEN; ...)
      const tokenMatch = cookieString.match(/better-auth\.session_token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (token) {
        if (!options.headers) {
          options.headers = {};
        }
        (options.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }
  }
});
