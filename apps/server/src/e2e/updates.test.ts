import { describe, expect, it } from "bun:test";
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
});
