import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import { SERVER_URL } from "./auth-client";

export interface VersionInfo {
  version: string;
  minRequiredVersion: string;
  apkUrl: string;
  releaseNotes?: string;
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map((n) => parseInt(n, 10) || 0);
  const parts2 = v2.split(".").map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export async function checkAndApplyUpdates(manual = false): Promise<boolean> {
  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";

  // Tier 1: Check Native APK updates from server (for Android binary distribution)
  if (Platform.OS === "android") {
    try {
      const response = await fetch(`${SERVER_URL}/api/app/version`, {
        headers: { "Cache-Control": "no-cache" },
      });

      if (response.ok) {
        const data: VersionInfo = await response.json();
        const hasNewApk = compareVersions(data.version, currentVersion) > 0;
        const isMandatory = compareVersions(data.minRequiredVersion, currentVersion) > 0;

        if (hasNewApk) {
          Alert.alert(
            isMandatory ? "Required App Update" : "New Version Available",
            `Version ${data.version} is available (Current: v${currentVersion}).\n\n${data.releaseNotes || "Please update to get the latest features and security updates."}`,
            [
              ...(!isMandatory ? [{ text: "Later", style: "cancel" as const }] : []),
              {
                text: "Download APK",
                onPress: () => {
                  Linking.openURL(data.apkUrl).catch(() => {
                    Alert.alert("Download Error", "Unable to open APK download link.");
                  });
                },
              },
            ],
            { cancelable: !isMandatory },
          );
          return true;
        }
      }
    } catch {
      // Server unreachable or in offline mode; fall through to OTA check
    }
  }

  // Tier 2: Check Over-The-Air (OTA) JS bundle updates via expo-updates
  if (!Updates.isEnabled) {
    if (manual) {
      Alert.alert(
        "Up to Date",
        `Secured Attendance is running v${currentVersion} (Local Development / Dev Client). Over-the-air updates apply automatically in standalone release builds.`,
      );
    }
    return false;
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      if (manual) {
        Alert.alert(
          "Up to Date",
          `Secured Attendance v${currentVersion} is running the latest update.`,
        );
      }
      return false;
    }

    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      Alert.alert(
        "Update Ready",
        "A new update has been downloaded. Restart the app now to apply the latest changes?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Restart Now",
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch {}
            },
          },
        ],
      );
      return true;
    }
  } catch (err: unknown) {
    if (manual) {
      const errorMsg = (err as { message?: string })?.message || "Could not check for updates.";
      Alert.alert("Update Check Failed", errorMsg);
    }
  }

  return false;
}

export function useUpdateCheck() {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setIsChecking(true);
    checkAndApplyUpdates(false).finally(() => {
      if (isMounted) setIsChecking(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { isChecking };
}
