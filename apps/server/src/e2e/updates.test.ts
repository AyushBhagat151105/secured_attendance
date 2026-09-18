import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { app } from "../index";

interface VersionResponse {
  version: string;
  minRequiredVersion: string;
  apkUrl: string;
  releaseNotes: string;
}

interface ManifestResponse {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: {
    key: string;
    contentType: string;
    url: string;
  };
  assets: Array<{
    key: string;
    contentType: string;
    fileExtension: string;
    url: string;
  }>;
}

describe("Application Updates System", () => {
  const uploadsDir = path.resolve(import.meta.dir, "../../uploads");
  const updatesDir = path.join(uploadsDir, "updates");
  const bundleDir = path.join(updatesDir, "_expo/static/js/android");
  const bundleRelPath = "_expo/static/js/android/entry-test-bundle.hbc";
  const bundlePath = path.join(updatesDir, bundleRelPath);
  const manifestPath = path.join(updatesDir, "metadata.json");
  const downloadsDir = path.join(uploadsDir, "downloads");
  const apkPath = path.join(downloadsDir, "secured-attendance.apk");

  let createdUploadsDir = false;
  let createdBundleDir = false;
  let createdDownloadsDir = false;
  let createdMetadata = false;
  let createdBundle = false;
  let createdApk = false;

  beforeAll(() => {
    // Provide isolated fixtures when running in clean CI or containers without uploads/
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      createdUploadsDir = true;
    }
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
      createdBundleDir = true;
    }
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      createdDownloadsDir = true;
    }

    if (!fs.existsSync(manifestPath)) {
      const mockManifest = {
        version: 0,
        bundler: "metro",
        fileMetadata: {
          android: {
            bundle: bundleRelPath,
            assets: [],
          },
        },
      };
      fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), "utf8");
      createdMetadata = true;
    }

    if (!fs.existsSync(bundlePath)) {
      fs.writeFileSync(bundlePath, "// Mock Hermes Bytecode Bundle", "utf8");
      createdBundle = true;
    }

    if (!fs.existsSync(apkPath)) {
      fs.writeFileSync(apkPath, "PK\x03\x04mock-apk-binary-content", "utf8");
      createdApk = true;
    }
  });

  afterAll(() => {
    // Clean up temporary fixtures created specifically for test isolation
    if (createdBundle && fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
    }
    if (createdMetadata && fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    if (createdApk && fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }
    if (createdBundleDir && fs.existsSync(bundleDir)) {
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
    if (createdDownloadsDir && fs.existsSync(downloadsDir)) {
      fs.rmSync(downloadsDir, { recursive: true, force: true });
    }
    if (createdUploadsDir && fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  });

  it("GET /api/app/version returns native APK version info", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/app/version", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as VersionResponse;
    expect(data.version).toBeDefined();
    expect(data.minRequiredVersion).toBeDefined();
    expect(data.apkUrl).toContain(".apk");
    expect(data.releaseNotes).toBeDefined();
  });

  it("GET /updates returns valid Expo Updates Protocol manifest", async () => {
    const response = await app.handle(
      new Request("http://localhost/updates", {
        method: "GET",
        headers: {
          "expo-platform": "android",
          "expo-runtime-version": "1.0.1",
          "expo-protocol-version": "0",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("expo-protocol-version")).toBe("0");

    const manifest = (await response.json()) as ManifestResponse;
    expect(manifest.id).toBeDefined();
    expect(manifest.createdAt).toBeDefined();
    expect(manifest.runtimeVersion).toBe("1.0.1");
    expect(manifest.launchAsset).toBeDefined();
    expect(manifest.launchAsset.url).toContain("/updates/_expo/static/js/android/");
    expect(manifest.launchAsset.contentType).toBe("application/javascript");
    expect(Array.isArray(manifest.assets)).toBe(true);
  });

  it("GET /updates/* serves bundle file successfully", async () => {
    const manifestResponse = await app.handle(
      new Request("http://localhost/updates", {
        method: "GET",
        headers: { "expo-platform": "android" },
      }),
    );

    const manifest = (await manifestResponse.json()) as ManifestResponse;
    const bundleUrl = manifest.launchAsset.url;
    const bundlePath = new URL(bundleUrl).pathname;

    const bundleResponse = await app.handle(
      new Request(`http://localhost${bundlePath}`, { method: "GET" }),
    );

    expect(bundleResponse.status).toBe(200);
    expect(bundleResponse.headers.get("content-type")).toBe("application/javascript");
  });

  it("GET /download/:file serves APK binary file with proper download headers", async () => {
    const response = await app.handle(
      new Request("http://localhost/download/secured-attendance.apk", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(response.headers.get("content-disposition")).toContain("secured-attendance.apk");
  });

  it("GET /updates returns 404 for unknown platform", async () => {
    const response = await app.handle(
      new Request("http://localhost/updates", {
        method: "GET",
        headers: { "expo-platform": "unsupported-os" },
      }),
    );

    expect(response.status).toBe(404);
  });

  it("GET /updates/* returns 404 for non-existent bundle file", async () => {
    const response = await app.handle(
      new Request("http://localhost/updates/non-existent-bundle.js", { method: "GET" }),
    );

    expect(response.status).toBe(404);
  });

  it("GET /download/:file returns 404 for non-existent binary", async () => {
    const response = await app.handle(
      new Request("http://localhost/download/non-existent-app.apk", { method: "GET" }),
    );

    expect(response.status).toBe(404);
  });
});
