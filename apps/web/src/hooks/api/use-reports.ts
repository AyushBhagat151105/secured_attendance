import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { unwrapEden } from "@/lib/fetch-utils";

export function useTeacherSessionsReport() {
  return useQuery({
    queryKey: ["teacher", "reports", "sessions"],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.teacher.reports.sessions.get()),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      unwrapEden(apiClient.api.teacher.sessions({ id: sessionId }).delete()),
    onSuccess: () => {
      toast.success("Session deleted successfully");
      qc.invalidateQueries({ queryKey: ["teacher", "reports", "sessions"] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useTeacherSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ["teacher", "reports", "session", sessionId],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.teacher.reports.sessions({ id: sessionId }).get()),
    enabled: !!sessionId,
  });
}

export function useTeacherSubjectsReport() {
  return useQuery({
    queryKey: ["teacher", "reports", "subjects"],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.teacher.reports.subjects.get()),
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin", "reports", "analytics"],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.admin.reports.analytics.get()),
  });
}

export function useAdminMapData(sessionId: string) {
  return useQuery({
    queryKey: ["admin", "reports", "map", sessionId],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.admin.reports.sessions({ id: sessionId }).map.get()),
    enabled: !!sessionId,
  });
}

export function useTeacherMapData(sessionId: string) {
  return useQuery({
    queryKey: ["teacher", "reports", "map", sessionId],
    staleTime: 1000 * 60 * 5,
    queryFn: () => unwrapEden(apiClient.api.teacher.reports.sessions({ id: sessionId }).map.get()),
    enabled: !!sessionId,
  });
}
