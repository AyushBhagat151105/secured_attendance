import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";
import { Elysia } from "elysia";

import { logger } from "./lib/logger";
import { adminModule } from "./routes/admin.route";
import { authModule } from "./routes/auth.route";
import { teacherModule } from "./routes/teacher.route";
import { studentModule } from "./routes/student.route";

const app = new Elysia()
  .onRequest(({ request }) => {
    logger.info(`Received ${request.method} ${request.url}`);
  })
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    
    if (request.url.includes("change-password")) {
      const session = await auth.api.getSession({ headers: request.headers });
      logger.warn("[index.ts] User on change-password:", session?.user || "NO USER");
    }

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
    })
  )
  .use(adminModule)
  .use(authModule)
  .use(teacherModule)
  .use(studentModule)
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });

// Export the App type for Eden Treaty type inference on the frontend
export type App = typeof app;
