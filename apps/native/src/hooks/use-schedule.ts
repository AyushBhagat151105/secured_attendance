import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "../api/attendance";

export const scheduleKeys = {
  all: ["schedule"] as const,
  today: () => [...scheduleKeys.all, "today"] as const,
};

export function useTodaySchedule() {
  return useQuery({
    queryKey: scheduleKeys.today(),
    queryFn: attendanceApi.getTodaySchedule,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
