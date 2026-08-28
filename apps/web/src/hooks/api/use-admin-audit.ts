import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { unwrapEden } from "@/lib/fetch-utils";

export interface AnomalyFilters {
  status?: string;
  userId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export function useAdminAnomalies(filters: AnomalyFilters = {}) {
  return useQuery({
    queryKey: ["admin", "anomalies", filters],
    staleTime: 1000 * 60 * 5,
    queryFn: () => {
      const query: Record<string, string | number> = {};
      if (filters.status) query.status = filters.status;
      if (filters.userId) query.userId = filters.userId;
      if (filters.type) query.type = filters.type;
      if (filters.dateFrom) query.dateFrom = filters.dateFrom;
      if (filters.dateTo) query.dateTo = filters.dateTo;
      if (filters.limit !== undefined) query.limit = filters.limit;
      if (filters.offset !== undefined) query.offset = filters.offset;
      return unwrapEden(apiClient.api.admin.anomalies.get({ query }));
    },
  });
}

export function useResolveAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrapEden(apiClient.api.admin.anomalies({ id }).resolve.patch()),
    onSuccess: () => {
      toast.success("Anomaly marked as resolved");
      qc.invalidateQueries({ queryKey: ["admin", "anomalies"] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminAuditLogs(params: {
  limit?: number;
  offset?: number;
  eventType?: string;
  actor?: string;
}) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    staleTime: 1000 * 60 * 5,
    queryFn: () =>
      unwrapEden(
        apiClient.api.admin["audit-logs"].get({
          query: {
            limit: params.limit,
            offset: params.offset,
            eventType: params.eventType,
            actor: params.actor,
          },
        }),
      ),
  });
}
