import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z
      .string()
      .default("https://attendance-api.ayushbhagat.com"),
    EXPO_PUBLIC_AUTH_REDIRECT_PATH: z.string().default("auth/callback"),
  },
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
    EXPO_PUBLIC_AUTH_REDIRECT_PATH: process.env.EXPO_PUBLIC_AUTH_REDIRECT_PATH,
  },
  emptyStringAsUndefined: true,
});

