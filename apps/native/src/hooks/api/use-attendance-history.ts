import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

export const historyKeys = {
  all: ["attendance"] as const,
  history: () => [...historyKeys.all, "history"] as const,
  stats: () => [...historyKeys.all, "stats"] as const,
};

export function useAttendanceHistory() {
  return useInfiniteQuery({
    queryKey: historyKeys.history(),
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const res = await apiClient.get("/api/student/attendance/my", {
          params: { page: pageParam.toString(), limit: "20" },
        });
        return res.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || err.message || "Failed to load history");
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const next = lastPage.page + 1;
      return next <= Math.ceil(lastPage.total / lastPage.limit) ? next : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceStats() {
  return useQuery({
    queryKey: historyKeys.stats(),
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/student/attendance/stats");
        return res.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || err.message || "Failed to load stats");
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
