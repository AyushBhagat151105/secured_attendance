import * as ExpoCamera from "expo-camera";
import * as ExpoLocalAuthentication from "expo-local-authentication";
import * as ExpoLocation from "expo-location";
import * as ExpoMaps from "expo-maps";
import * as ExpoSensors from "expo-sensors";

// Central import surface for the optional Expo modules selected at scaffold time.
// Import the relevant namespace from this object when wiring app-specific permissions and flows.
export const mobileLibraries = {
  ExpoCamera,
  ExpoLocation,
  ExpoSensors,
  ExpoLocalAuthentication,
  ExpoMaps,
} as const;
