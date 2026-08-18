import type { App } from "server/src/index";

import { treaty } from "@elysiajs/eden";

import { env } from "@secured_attendance/env/web";

/**
 * Eden Treaty client — provides end-to-end type safety from the Elysia server.
 *
 * The `App` type is imported directly from the server entry point.
 * All API calls are made through this singleton.
 *
 * @example
 * const { data, error } = await apiClient.api.admin.users.get();
 * if (error) throw error;
 * return data;
 */
export const apiClient = treaty<App>(env.VITE_SERVER_URL, {
  fetch: {
    credentials: "include",
  },
});
