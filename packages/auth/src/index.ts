import { expo } from "@better-auth/expo";
import prisma from "@secured_attendance/db";
import { env } from "@secured_attendance/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, bearer } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    env.CORS_ORIGIN,
    "native://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://192.168.*.*:*", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
      },
      requiresPasswordChange: {
        type: "boolean",
        required: false,
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
    disableOriginCheck: env.NODE_ENV === "development",
    disableCSRFCheck: env.NODE_ENV === "development",
  },
  plugins: [organization(), admin(), bearer(), expo()],
});
