import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { attendanceApi } from "../api/attendance";

export const historyKeys = {
  all: ["attendance"] as const,
  history: () => [...historyKeys.all, "history"] as const,
  stats: () => [...historyKeys.all, "stats"] as const,
};

export function useAttendanceHistory() {
  return useInfiniteQuery({
    queryKey: historyKeys.history(),
    queryFn: ({ pageParam = 1 }) => attendanceApi.getHistory(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next <= Math.ceil(lastPage.total / lastPage.limit) ? next : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceStats() {
  return useQuery({
    queryKey: historyKeys.stats(),
    queryFn: attendanceApi.getStats,
    staleTime: 1000 * 60 * 5,
  });
}
