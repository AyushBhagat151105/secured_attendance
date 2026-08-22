import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "sa_device_id";

export async function getDeviceFingerprint(): Promise<{ id: string; name: string }> {
  // Generate a stable device ID
  let storedId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  let deviceId: string;
  
  if (!storedId) {
    // If we don't have one stored, create a deterministic one based on the device
    // or fallback to a new random UUID if we can't reliably fingerprint
    const rawFingerprint = `${Device.osName}-${Device.osVersion}-${Device.modelName}-${Device.totalMemory}-${Constants.sessionId}`;
    
    // Hash it so it's a clean UUID-like string
    deviceId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawFingerprint
    );
    
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  } else {
    deviceId = storedId;
  }

  // Friendly name for the UI
  const name = Device.modelName || Device.designName || "Unknown Device";
  
  return {
    id: deviceId,
    name,
  };
}
