import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "sa_device_id_v2";

/**
 * Safely queries native Android ID via expo-application without crashing
 * if the native module is not linked in the running binary (e.g. Expo Go or dev client).
 */
function getNativeAndroidId(): string | null {
  if (Platform.OS !== "android") return null;
  try {
    // Dynamic require protects against top-level module load failures
    const appModule = require("expo-application");
    if (appModule && typeof appModule.getAndroidId === "function") {
      return appModule.getAndroidId();
    }
  } catch {
    // Native module 'ExpoApplication' not compiled into running client binary
  }
  return null;
}

/**
 * Safely queries iOS Identifier for Vendor via expo-application without crashing.
 */
async function getNativeIosVendorId(): Promise<string | null> {
  if (Platform.OS !== "ios") return null;
  try {
    const appModule = require("expo-application");
    if (appModule && typeof appModule.getIosIdForVendorAsync === "function") {
      return await appModule.getIosIdForVendorAsync();
    }
  } catch {
    // Native module 'ExpoApplication' not compiled into running client binary
  }
  return null;
}

export async function getDeviceFingerprint(): Promise<{ id: string; name: string }> {
  const name =
    Device.modelName ||
    Device.productName ||
    Device.designName ||
    (Device.brand ? `${Device.brand} Phone` : "Smart Phone");

  // 1. Fast path: check SecureStore for previously resolved hardware ID
  try {
    const storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (storedId) {
      return { id: storedId, name };
    }
  } catch {
    // Ignore SecureStore errors and proceed to deterministic hardware derivation
  }

  // 2. Hardware OS identifier (Survives uninstalls, reinstalls, and updates on Android)
  let rawHardwareId: string | null = null;
  if (Platform.OS === "android") {
    rawHardwareId = getNativeAndroidId();
  } else if (Platform.OS === "ios") {
    rawHardwareId = await getNativeIosVendorId();
  }

  // 3. Combine with static hardware specs from expo-device (already linked in native binary)
  // NOTE: Never include dynamic memory (Device.totalMemory) or installation IDs (Constants.installationId)
  // because they fluctuate between boots/reinstalls and break cryptographic binding.
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

  // 4. Create deterministic SHA-256 hash
  const deviceId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hardwareSignature,
  );

  // 5. Cache back in SecureStore for faster future lookups
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  } catch {
    // Non-fatal if SecureStore is temporarily unavailable
  }

  return {
    id: deviceId,
    name,
  };
}
