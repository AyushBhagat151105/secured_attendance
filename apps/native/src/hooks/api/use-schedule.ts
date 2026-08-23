import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

export const scheduleKeys = {
  all: ["schedule"] as const,
  today: () => [...scheduleKeys.all, "today"] as const,
};

export function useTodaySchedule() {
  return useQuery({
    queryKey: scheduleKeys.today(),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/student/schedule/today');
        return res.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || err.message || "Failed to load schedule");
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
