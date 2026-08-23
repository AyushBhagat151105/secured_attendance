import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

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

export function useScanAttendance() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: ScanAttendancePayload) => {
      try {
        const res = await apiClient.post('/api/student/attendance/scan', payload);
        return res.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || err.message || "Failed to scan attendance");
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries (e.g. today's attendance, streak)
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
