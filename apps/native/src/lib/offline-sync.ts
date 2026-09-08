import * as SecureStore from "expo-secure-store";
import { type ScanAttendancePayload } from "../hooks/api/use-attendance";
import { apiClient } from "./api-client";
import { authClient } from "./auth-client";

const PENDING_SCANS_KEY = "pending_attendance_scans";

export async function savePendingAttendance(payload: ScanAttendancePayload) {
  try {
    const existing = await SecureStore.getItemAsync(PENDING_SCANS_KEY);
    const scans: ScanAttendancePayload[] = existing ? JSON.parse(existing) : [];

    const enriched: ScanAttendancePayload = {
      ...payload,
      scannedAt: payload.scannedAt || Date.now(),
      isOfflineSync: true,
    };

    // Check if this session is already queued to avoid duplicates
    if (!scans.some((s) => s.sessionId === payload.sessionId && s.nonce === payload.nonce)) {
      scans.push(enriched);
      await SecureStore.setItemAsync(PENDING_SCANS_KEY, JSON.stringify(scans));
    }
  } catch (error) {
    console.error("Failed to save pending attendance", error);
  }
}

export async function getPendingScansCount(): Promise<number> {
  try {
    const existing = await SecureStore.getItemAsync(PENDING_SCANS_KEY);
    if (!existing) return 0;
    const scans: ScanAttendancePayload[] = JSON.parse(existing);
    return scans.length;
  } catch {
    return 0;
  }
}

export async function syncPendingAttendance(): Promise<number> {
  try {
    const existing = await SecureStore.getItemAsync(PENDING_SCANS_KEY);
    if (!existing) return 0;

    const scans: ScanAttendancePayload[] = JSON.parse(existing);
    if (scans.length === 0) return 0;

    // Do not attempt to sync if the user is not authenticated
    const session = await authClient.getSession();
    if (!session?.data?.user) {
      return 0;
    }

    let successfulSyncs = 0;
    const remainingScans: ScanAttendancePayload[] = [];

    for (const scan of scans) {
      try {
        await apiClient.post("/api/student/attendance/scan", {
          ...scan,
          isOfflineSync: true,
        });
        successfulSyncs++;
      } catch (error: any) {
        const respData = error.response?.data;
        const msg = (respData?.message || error.message || "").toLowerCase();

        // If it was already marked, that counts as success! Drop it safely.
        if (msg.includes("already marked")) {
          successfulSyncs++;
          continue;
        }

        // Check if this is a network/connectivity/timeout error
        const isNetworkError =
          !error.response ||
          error.code === "ECONNABORTED" ||
          msg.includes("network") ||
          msg.includes("failed to fetch") ||
          msg.includes("timeout");

        if (isNetworkError) {
          // Keep it in the queue for the next sync attempt
          remainingScans.push(scan);
        } else {
          // Non-network rejection (e.g. invalid signature, wrong classroom)
          console.warn("Dropping pending scan due to server rejection:", msg);
        }
      }
    }

    if (remainingScans.length === 0) {
      await SecureStore.deleteItemAsync(PENDING_SCANS_KEY);
    } else {
      await SecureStore.setItemAsync(PENDING_SCANS_KEY, JSON.stringify(remainingScans));
    }

    return successfulSyncs;
  } catch (error) {
    console.error("Failed to sync pending attendance", error);
    return 0;
  }
}
