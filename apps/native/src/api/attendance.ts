import { apiClient } from "../lib/api-client";

export type ScanAttendancePayload = {
  sessionId: string;
  nonce: string;
  signature: string;
  expiresAt: number;
  gpsLat?: number;
  gpsLng?: number;
  deviceFingerprint?: string;
};

export const attendanceApi = {
  scanAttendance: async (payload: ScanAttendancePayload) => {
    const { data, error } = await apiClient.api.student.attendance.scan.post(payload);
    
    if (error) {
      throw new Error((error.value as any)?.message || "Failed to scan attendance");
    }
    
    return data;
  }
};
