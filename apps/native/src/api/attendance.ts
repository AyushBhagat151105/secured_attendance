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
  },
  
  getTodaySchedule: async () => {
    const { data, error } = await apiClient.api.student.schedule.today.get();
    if (error) throw new Error("Failed to load schedule");
    return data;
  },

  getHistory: async (page = 1, limit = 20) => {
    const { data, error } = await apiClient.api.student.attendance.my.get({
      query: { page: page.toString(), limit: limit.toString() }
    });
    if (error) throw new Error("Failed to load history");
    return data;
  },

  getStats: async () => {
    const { data, error } = await apiClient.api.student.attendance.stats.get();
    if (error) throw new Error("Failed to load stats");
    return data;
  },

  getProfile: async () => {
    const { data, error } = await apiClient.api.student.profile.get();
    if (error) throw new Error("Failed to load profile");
    return data;
  }
};
