import type { App } from "server/src/index";

import { treaty } from "@elysiajs/eden";
import { env } from "@secured_attendance/env/native";
import { authClient } from "./auth-client";

export const apiClient = treaty<App>(env.EXPO_PUBLIC_SERVER_URL, {
  fetcher: async (url: string | URL | Request, options?: RequestInit) => {
    return authClient.$fetch(url as string, options as any);
  }
} as any);
