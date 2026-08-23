import { expo } from "@better-auth/expo";
import prisma from "@secured_attendance/db";
import { env } from "@secured_attendance/env/server";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, bearer, jwt } from "better-auth/plugins";

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
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
    disableOriginCheck: env.NODE_ENV === "development",
    disableCSRFCheck: env.NODE_ENV === "development",
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          
          if (!email.endsWith("@charusat.edu.in") && !email.endsWith("@charusat.ac.in")) {
            throw new APIError("BAD_REQUEST", { message: "Invalid email domain. Must be @charusat.edu.in or @charusat.ac.in" });
          }

          return { data: user };
        }
      }
    }
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      console.log(`[Auth Hook] Path: ${ctx.path}`, {
        body: ctx.body,
        headers: ctx.headers,
      });
      if (ctx.path === "/sign-up/email") {
        if (ctx.request) {
          throw new APIError("FORBIDDEN", { message: "Self-registration is disabled. Contact your administrator." });
        }
      }
    })
  },
  plugins: [organization(), admin(), bearer(), expo(), jwt()],
});
