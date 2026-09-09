import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";
import { teacherKeys } from "./use-teacher";
import { toast } from "sonner";

export const manualAttendanceKeys = {
  roster: (timetableEntryId: string) => ["teacher", "timetable-roster", timetableEntryId] as const,
  sessionRoster: (sessionId: string) => ["teacher", "session-roster", sessionId] as const,
};

export function useTimetableRoster(timetableEntryId: string | null) {
  return useQuery({
    queryKey: manualAttendanceKeys.roster(timetableEntryId || ""),
    enabled: !!timetableEntryId,
    queryFn: () =>
      unwrapEden(apiClient.api.teacher.timetable({ id: timetableEntryId! }).roster.get()),
  });
}

export function useSubmitManualAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { timetableEntryId: string; presentStudentIds: string[]; notes?: string }) =>
      unwrapEden(apiClient.api.teacher.sessions.manual.post(data)),
    onSuccess: (res: any) => {
      toast.success(`Manual attendance recorded (${res.presentCount} present)`);
      qc.invalidateQueries({ queryKey: teacherKeys.schedule });
      qc.invalidateQueries({ queryKey: ["teacher", "reports"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to record manual attendance"),
  });
}

export function useSessionRoster(sessionId: string | null) {
  return useQuery({
    queryKey: manualAttendanceKeys.sessionRoster(sessionId || ""),
    enabled: !!sessionId,
    queryFn: () =>
      unwrapEden(apiClient.api.teacher.sessions({ id: sessionId! }).roster.get()),
  });
}

export function useFinalizeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, presentStudentIds }: { sessionId: string; presentStudentIds: string[] }) =>
      unwrapEden(apiClient.api.teacher.sessions({ id: sessionId }).finalize.post({ presentStudentIds })),
    onSuccess: (res: any, vars) => {
      toast.success(`Attendance finalized (${res.totalPresent} present)`);
      qc.invalidateQueries({ queryKey: teacherKeys.schedule });
      qc.invalidateQueries({ queryKey: ["teacher", "reports"] });
      qc.invalidateQueries({ queryKey: ["teacher", "reports", "session", vars.sessionId] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to finalize attendance"),
  });
}
