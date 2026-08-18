import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton QueryClient with project-wide defaults.
 *
 * - staleTime: 60s  — data stays fresh for 1 minute before a background refetch
 * - gcTime: 5min    — unused queries are garbage-collected after 5 minutes
 * - retry: 1        — retry failed requests once before showing error state
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
