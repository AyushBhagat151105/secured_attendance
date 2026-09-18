import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";
import { Elysia } from "elysia";
import path from "node:path";
import fs from "node:fs";

import { logger } from "./lib/logger";
import { adminModule } from "./routes/admin.route";
import { authModule } from "./routes/auth.route";
import { teacherModule } from "./routes/teacher.route";
import { studentModule } from "./routes/student.route";

export const app = new Elysia()
  .onError(({ code, error, set, request }) => {
    // Schema validation errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        error: "VALIDATION_ERROR",
        message: error.message || "Invalid request payload or parameters",
        details: (error as { all?: unknown }).all ?? error.message,
      };
    }

    // Not found errors
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: "NOT_FOUND",
        message: "Route or resource not found",
      };
    }

    // Parse errors (e.g. malformed JSON)
    if (code === "PARSE") {
      set.status = 400;
      return {
        success: false,
        error: "PARSE_ERROR",
        message: "Failed to parse JSON body",
      };
    }

    const prismaError = error as { code?: string };
    // Prisma unique constraint violation
    if (prismaError?.code === "P2002") {
      set.status = 400;
      return {
        success: false,
        error: "CONFLICT",
        message: "A record with this unique identifier already exists",
      };
    }

    // Prisma record not found
    if (prismaError?.code === "P2025") {
      set.status = 404;
      return {
        success: false,
        error: "NOT_FOUND",
        message: "Requested record was not found",
      };
    }

    // Log unexpected exceptions safely
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as any).message)
          : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error("Unhandled server exception", {
      error: errorMessage,
      stack: errorStack,
      url: request.url,
      method: request.method,
    });

    set.status = 500;
    return {
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal server error occurred",
    };
  })
  .onRequest(({ request }) => {
    logger.info(`Received ${request.method} ${request.url}`);
  })
  .use(
    cors({
      origin: env.NODE_ENV === "development" ? true : env.CORS_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "expo-origin", "x-skip-oauth-proxy"],
      credentials: true,
    }),
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;

    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .use(
    openapi({
      provider: "scalar",
      path: "/scalar",
      documentation: {
        info: {
          title: "Secured Attendance API",
          version: "1.0.0",
        },
      },
    }),
  )
  .use(adminModule)
  .use(authModule)
  .use(teacherModule)
  .use(studentModule)
  .get("/", () => "OK")

  // Self-Hosted OTA Updates endpoints for mobile app
  .get("/updates", async ({ set }) => {
    const manifestPath = path.resolve(process.cwd(), "uploads/updates/metadata.json");
    if (!fs.existsSync(manifestPath)) {
      set.status = 404;
      return { error: "No OTA update available" };
    }
    set.headers["content-type"] = "application/json";
    set.headers["expo-protocol-version"] = "0";
    set.headers["expo-sfv-version"] = "0";
    return Bun.file(manifestPath);
  })
  .get("/updates/*", async ({ params, set }) => {
    const wildcard = params["*"];
    const filePath = path.resolve(process.cwd(), "uploads/updates", wildcard);
    if (!fs.existsSync(filePath)) {
      set.status = 404;
      return "Not found";
    }
    return Bun.file(filePath);
  });

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

if (process.env.NODE_ENV !== "test" && env.NODE_ENV !== "test") {
  app.listen({ port, hostname: "0.0.0.0" }, () => {
    logger.info(`Server is running on http://0.0.0.0:${port}`);
  });
}

// Export the App type for Eden Treaty type inference on the frontend
export type App = typeof app;
