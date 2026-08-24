import * as SecureStore from "expo-secure-store";
import { type ScanAttendancePayload } from "../hooks/api/use-attendance";
import { apiClient } from "./api-client";

const PENDING_SCANS_KEY = "pending_attendance_scans";

export async function savePendingAttendance(payload: ScanAttendancePayload) {
  try {
    const existing = await SecureStore.getItemAsync(PENDING_SCANS_KEY);
    const scans: ScanAttendancePayload[] = existing ? JSON.parse(existing) : [];

    // Check if this session is already queued to avoid duplicates
    if (!scans.some((s) => s.sessionId === payload.sessionId && s.nonce === payload.nonce)) {
      scans.push(payload);
      await SecureStore.setItemAsync(PENDING_SCANS_KEY, JSON.stringify(scans));
    }
  } catch (error) {
    console.error("Failed to save pending attendance", error);
  }
}

export async function syncPendingAttendance(): Promise<number> {
  try {
    const existing = await SecureStore.getItemAsync(PENDING_SCANS_KEY);
    if (!existing) return 0;

    const scans: ScanAttendancePayload[] = JSON.parse(existing);
    if (scans.length === 0) return 0;

    let successfulSyncs = 0;
    const remainingScans: ScanAttendancePayload[] = [];

    for (const scan of scans) {
      try {
        await apiClient.post("/api/student/attendance/scan", scan);
        successfulSyncs++;
      } catch (error: any) {
        // If it's a network error, keep it in queue.
        // If it's a bad request (e.g. already marked, expired), drop it.
        const message = error.message?.toLowerCase() || "";
        if (
          message.includes("network") ||
          message.includes("failed to fetch") ||
          message.includes("timeout")
        ) {
          remainingScans.push(scan);
        } else {
          // Drop it
          console.warn("Dropping pending scan due to non-network error:", error.message);
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
