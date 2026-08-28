import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";
import { toast } from "sonner";

export const teacherKeys = {
  schedule: ["teacher", "dashboard"] as const,
};

export function useTodaySchedule() {
  return useQuery({
    queryKey: teacherKeys.schedule,
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.teacher.schedule.today.get()),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (timetableEntryId: string) =>
      unwrapEden(apiClient.api.teacher.sessions.post({ timetableEntryId })),
    onSuccess: () => {
      toast.success("Session started successfully");
      qc.invalidateQueries({ queryKey: teacherKeys.schedule });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      unwrapEden(apiClient.api.teacher.sessions({ id: sessionId }).close.post({})),
    onSuccess: () => {
      toast.success("Session closed successfully");
      qc.invalidateQueries({ queryKey: teacherKeys.schedule });
    },
    onError: (error) => toast.error(error.message),
  });
}

export const subscribeToSession = (sessionId: string) => {
  return apiClient.api.teacher.ws.sessions({ id: sessionId }).subscribe();
};
