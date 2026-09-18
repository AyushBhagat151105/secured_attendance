import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "sa_device_id_v2";

function getNativeAndroidId(): string | null {
  if (Platform.OS !== "android") return null;
  try {
    const appModule = require("expo-application");
    if (appModule && typeof appModule.getAndroidId === "function") {
      return appModule.getAndroidId();
    }
  } catch {}
  return null;
}

async function getNativeIosVendorId(): Promise<string | null> {
  if (Platform.OS !== "ios") return null;
  try {
    const appModule = require("expo-application");
    if (appModule && typeof appModule.getIosIdForVendorAsync === "function") {
      return await appModule.getIosIdForVendorAsync();
    }
  } catch {}
  return null;
}

export async function getDeviceFingerprint(): Promise<{ id: string; name: string }> {
  const name =
    Device.modelName ||
    Device.productName ||
    Device.designName ||
    (Device.brand ? `${Device.brand} Phone` : "Smart Phone");

  try {
    const storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (storedId) {
      return { id: storedId, name };
    }
  } catch {}

  let rawHardwareId: string | null = null;
  if (Platform.OS === "android") {
    rawHardwareId = getNativeAndroidId();
  } else if (Platform.OS === "ios") {
    rawHardwareId = await getNativeIosVendorId();
  }

  const hardwareSignature = [
    Platform.OS,
    rawHardwareId || "no_android_id",
    Device.brand || "unknown_brand",
    Device.manufacturer || "unknown_manufacturer",
    Device.modelName || "unknown_model",
    Device.productName || "unknown_product",
    Device.designName || "unknown_design",
    Device.osBuildFingerprint || Device.osInternalBuildId || "fallback_build",
  ].join(":");

  const deviceId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hardwareSignature,
  );

  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  } catch {}

  return {
    id: deviceId,
    name,
  };
}

export interface CloneDetectionResult {
  isCloned: boolean;
  reason: string | null;
}

const SUSPICIOUS_CLONE_SIGNATURES = [
  "com.lbe.parallel",
  "com.dualspace",
  "io.va.exposed",
  "com.excelliance.multiaccount",
  "com.polestar.super.clone",
  "com.gspace.android",
  "com.cloneapp",
  "parallel",
  "virtual",
  "dualspace",
  "cloned",
];

export function detectClonedEnvironment(): CloneDetectionResult {
  if (Platform.OS !== "android") {
    return { isCloned: false, reason: null };
  }

  try {
    let storagePath = "";
    try {
      const FileSystem = require("expo-file-system");
      storagePath = (
        FileSystem.documentDirectory ||
        FileSystem.cacheDirectory ||
        ""
      ).toLowerCase();
    } catch {}

    if (storagePath) {
      for (const sig of SUSPICIOUS_CLONE_SIGNATURES) {
        if (storagePath.includes(sig)) {
          return {
            isCloned: true,
            reason: `Virtual container signature detected in storage path: ${sig}`,
          };
        }
      }

      const multiUserMatch = storagePath.match(/\/data\/user\/([1-9][0-9]*)\//);
      if (multiUserMatch) {
        return {
          isCloned: true,
          reason: `Secondary work/cloned user profile detected (User ID: ${multiUserMatch[1]})`,
        };
      }
    }
  } catch {}

  try {
    const appModule = require("expo-application");
    if (appModule && typeof appModule.applicationId === "string") {
      const appId = appModule.applicationId.toLowerCase();
      const isOfficial =
        appId === "com.ayush_bhagat_151105.xnative" ||
        appId === "host.exp.exponent" ||
        appId.includes("expo");

      if (!isOfficial) {
        if (appId.includes("clone") || appId.includes("dual") || appId.includes("parallel")) {
          return {
            isCloned: true,
            reason: `Cloned package identity detected: ${appId}`,
          };
        }
      }
    }
  } catch {}

  return { isCloned: false, reason: null };
}
