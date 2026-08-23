import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export function useTeacherSessionsReport() {
  return useQuery({
    queryKey: ["teacher", "reports", "sessions"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.teacher.reports.sessions.get();
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await apiClient.api.teacher.sessions({ id: sessionId }).delete();
      if (error) throw new Error(error.value?.message || "Failed to delete session");
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await apiClient.api.teacher.reports.sessions({ id: sessionId }).get();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useTeacherSubjectsReport() {
  return useQuery({
    queryKey: ["teacher", "reports", "subjects"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.teacher.reports.subjects.get();
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin", "reports", "analytics"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.admin.reports.analytics.get();
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminMapData(sessionId: string) {
  return useQuery({
    queryKey: ["admin", "reports", "map", sessionId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.admin.reports.sessions({ id: sessionId }).map.get();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useTeacherMapData(sessionId: string) {
  return useQuery({
    queryKey: ["teacher", "reports", "map", sessionId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.teacher.reports.sessions({ id: sessionId }).map.get();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}
