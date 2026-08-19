import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, type ScanAttendancePayload } from "../api/attendance";

export function useScanAttendance() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: ScanAttendancePayload) => attendanceApi.scanAttendance(payload),
    onSuccess: () => {
      // Invalidate relevant queries (e.g. today's attendance, streak)
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
