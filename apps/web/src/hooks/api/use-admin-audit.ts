import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { unwrapEden } from "@/lib/fetch-utils";

export function useAdminAnomalies(status?: string) {
  return useQuery({
    queryKey: ["admin", "anomalies", { status }],
    queryFn: () =>
      unwrapEden(
        apiClient.api.admin.anomalies.get({
          query: status ? { status } : {},
        })
      ),
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
    queryFn: () =>
      unwrapEden(
        apiClient.api.admin["audit-logs"].get({
          query: {
            limit: params.limit,
            offset: params.offset,
            eventType: params.eventType,
            actor: params.actor,
          },
        })
      ),
  });
}
