import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "@/api/teacher";
import { toast } from "sonner";

export const teacherKeys = {
  schedule: ["teacher", "dashboard"] as const,
};

export function useTodaySchedule() {
  return useQuery({
    queryKey: teacherKeys.schedule,
    queryFn: teacherApi.getTodaySchedule,
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.startSession,
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
    mutationFn: teacherApi.closeSession,
    onSuccess: () => {
      toast.success("Session closed successfully");
      qc.invalidateQueries({ queryKey: teacherKeys.schedule });
    },
    onError: (error) => toast.error(error.message),
  });
}
