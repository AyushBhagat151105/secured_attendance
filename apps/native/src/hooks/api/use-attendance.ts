import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

export type ScanAttendancePayload = {
  sessionId: string;
  nonce: string;
  signature: string;
  expiresAt: number;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  mockFlag?: boolean;
  deviceFingerprint?: string;
  isOfflineSync?: boolean;
  scannedAt?: number;
  isCloned?: boolean;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  response?: unknown;

  constructor(message: string, status?: number, code?: string, response?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

export function useScanAttendance() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ScanAttendancePayload) => {
      try {
        const res = await apiClient.post("/api/student/attendance/scan", payload);
        return res.data;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string; error?: string } };
          code?: string;
          message?: string;
        };
        const message =
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message ||
          "Failed to scan attendance";
        throw new ApiError(
          message,
          axiosErr.response?.status,
          axiosErr.code,
          axiosErr.response,
        );
      }
    },
    onSuccess: () => {
      // Invalidate both attendance stats and today's schedule so card flips to Present immediately
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
