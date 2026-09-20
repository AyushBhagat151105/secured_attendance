import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";
import { Elysia } from "elysia";
import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";

import { logger } from "./lib/logger";
import { adminModule } from "./routes/admin.route";
import { authModule } from "./routes/auth.route";
import { teacherModule } from "./routes/teacher.route";
import { studentModule } from "./routes/student.route";

const getUploadsDir = () => {
  if (process.env.UPLOADS_DIR && fs.existsSync(process.env.UPLOADS_DIR)) {
    return process.env.UPLOADS_DIR;
  }
  const candidates = [
    path.resolve(process.cwd(), "apps/server/uploads"),
    path.resolve(process.cwd(), "uploads"),
    path.resolve(import.meta.dir, "../uploads"),
    path.resolve(import.meta.dir, "../../uploads"),
    "/app/apps/server/uploads",
    "/app/uploads",
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads");
};

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
  .get("/updates", async ({ request, set }) => {
    const candidateDirs = [
      path.resolve(getUploadsDir(), "updates"),
      path.resolve(process.cwd(), "uploads/updates"),
      path.resolve(process.cwd(), "apps/server/uploads/updates"),
      "/app/apps/server/uploads/updates",
      "/app/uploads/updates",
    ];

    let manifestPath: string | null = null;
    for (const dir of candidateDirs) {
      const candidate = path.resolve(dir, "metadata.json");
      if (fs.existsSync(candidate)) {
        manifestPath = candidate;
        break;
      }
    }

    if (!manifestPath) {
      set.status = 404;
      set.headers["cache-control"] = "no-store, no-cache, must-revalidate";
      return { error: "No OTA update available" };
    }

    try {
      const metadataRaw = await Bun.file(manifestPath).text();
      const metadata = JSON.parse(metadataRaw);

      const platform = request.headers.get("expo-platform") || "android";
      const platformMetadata = metadata.fileMetadata?.[platform];

      if (!platformMetadata) {
        set.status = 404;
        return { error: `No update bundle found for platform: ${platform}` };
      }

      const host = request.headers.get("host") || "attendance-api.ayushbhagat.com";
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const isLocal =
        host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("192.168.") ||
        host.startsWith("10.");
      const proto = forwardedProto || (isLocal ? "http" : "https");
      const baseUrl = `${proto}://${host}`;

      const hash = createHash("sha256").update(metadataRaw).digest("hex");
      const updateId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

      const stat = fs.statSync(manifestPath);
      const createdAt = stat.mtime.toISOString();
      const runtimeVersion = request.headers.get("expo-runtime-version") || "1.0.1";

      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        ttf: "font/ttf",
        otf: "font/otf",
        xml: "application/xml",
        json: "application/json",
        js: "application/javascript",
        hbc: "application/javascript",
      };

      const assets = (platformMetadata.assets || []).map(
        (asset: { path: string; ext: string }) => {
          const assetKey = path.basename(asset.path);
          return {
            key: assetKey,
            contentType: mimeMap[asset.ext] || "application/octet-stream",
            fileExtension: `.${asset.ext}`,
            url: `${baseUrl}/updates/${asset.path}`,
          };
        },
      );

      const manifest = {
        id: updateId,
        createdAt,
        runtimeVersion,
        launchAsset: {
          key: "bundle",
          contentType: "application/javascript",
          url: `${baseUrl}/updates/${platformMetadata.bundle}`,
        },
        assets,
        metadata: {},
        extra: {},
      };

      const protocolVersion = request.headers.get("expo-protocol-version") || "0";
      set.headers["content-type"] = "application/json";
      set.headers["expo-protocol-version"] = protocolVersion === "1" ? "1" : "0";
      set.headers["expo-sfv-version"] = "0";
      set.headers["cache-control"] = "private, max-age=0";
      return manifest;
    } catch {
      set.status = 500;
      return { error: "Failed to construct OTA update manifest" };
    }
  })
  .get("/updates/*", async ({ params, set }) => {
    const wildcard = params["*"];
    const safeSubPath = path.normalize(wildcard).replace(/^(\.\.[\/\\])+/, "");

    const candidateDirs = [
      path.resolve(getUploadsDir(), "updates"),
      path.resolve(process.cwd(), "uploads/updates"),
      path.resolve(process.cwd(), "apps/server/uploads/updates"),
      "/app/apps/server/uploads/updates",
      "/app/uploads/updates",
    ];

    let filePath: string | null = null;
    for (const dir of candidateDirs) {
      const candidate = path.resolve(dir, safeSubPath);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      set.status = 404;
      set.headers["cache-control"] = "no-store, no-cache, must-revalidate";
      return "Not found";
    }

    const ext = path.extname(filePath).replace(".", "").toLowerCase();
    if (ext === "hbc" || ext === "js") {
      set.headers["content-type"] = "application/javascript";
    } else if (ext === "png") {
      set.headers["content-type"] = "image/png";
    } else if (ext === "ttf") {
      set.headers["content-type"] = "font/ttf";
    } else if (ext === "xml") {
      set.headers["content-type"] = "application/xml";
    }

    return Bun.file(filePath);
  })

  // Direct APK auto-update distribution endpoints (no Google Play Store required)
  .get("/api/app/version", () => {
    return {
      version: "1.0.1",
      minRequiredVersion: "1.0.0",
      apkUrl: "https://attendance-api.ayushbhagat.com/download/secured-attendance.apk",
      releaseNotes: "Automatic geofencing, hardware binding & anti-clone virtual container detection.",
    };
  })
  .get("/download/:file", async ({ params, set }) => {
    const filename = path.basename(params.file);

    const candidateDirs = [
      path.resolve(getUploadsDir(), "downloads"),
      path.resolve(process.cwd(), "uploads/downloads"),
      path.resolve(process.cwd(), "apps/server/uploads/downloads"),
      "/app/apps/server/uploads/downloads",
      "/app/uploads/downloads",
    ];

    let filePath: string | null = null;
    for (const dir of candidateDirs) {
      const candidate = path.resolve(dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      set.status = 404;
      set.headers["cache-control"] = "no-store, no-cache, must-revalidate";
      return "File not found";
    }
    set.headers["content-type"] = "application/vnd.android.package-archive";
    set.headers["content-disposition"] = `attachment; filename="${filename}"`;
    set.headers["cache-control"] = "public, max-age=3600";
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
