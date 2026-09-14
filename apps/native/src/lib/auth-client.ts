import { expoClient } from "@better-auth/expo/client";
import { jwtClient } from "better-auth/client/plugins";
import { env } from "@secured_attendance/env/native";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Direct reference to process.env.EXPO_PUBLIC_SERVER_URL ensures Metro inlines
// the variable at bundle time rather than relying on dynamic object resolution.
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

console.log("🚀 [Auth Client Initialized with Server URL]:", SERVER_URL);

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  plugins: [
    jwtClient(),
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
    }),
  ],
});
