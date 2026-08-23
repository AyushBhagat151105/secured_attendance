import { apiClient } from "../lib/api-client";

export type ScanAttendancePayload = {
  sessionId: string;
  nonce: string;
  signature: string;
  expiresAt: number;
  gpsLat?: number;
  gpsLng?: number;
  mockFlag?: boolean;
  deviceFingerprint?: string;
};

export const attendanceApi = {
  scanAttendance: async (payload: ScanAttendancePayload) => {
    try {
      const res = await apiClient.post('/api/student/attendance/scan', payload);
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || "Failed to scan attendance");
    }
  },
  
  getTodaySchedule: async () => {
    try {
      const res = await apiClient.get('/api/student/schedule/today');
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || "Failed to load schedule");
    }
  },

  getHistory: async (page = 1, limit = 20) => {
    try {
      const res = await apiClient.get('/api/student/attendance/my', {
        params: { page: page.toString(), limit: limit.toString() }
      });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || "Failed to load history");
    }
  },

  getStats: async () => {
    try {
      const res = await apiClient.get('/api/student/attendance/stats');
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || "Failed to load stats");
    }
  },

  getProfile: async () => {
    try {
      const res = await apiClient.get('/api/student/profile');
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || "Failed to load profile");
    }
  }
};
