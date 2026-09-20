import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";

export const deviceKeys = {
  all: ["admin-devices"] as const,
  rebindRequests: (filters: Record<string, any> = {}) =>
    [...deviceKeys.all, "rebind-requests", filters] as const,
  inventory: (filters: Record<string, any> = {}) =>
    [...deviceKeys.all, "inventory", filters] as const,
};

export const useRebindRequests = (filters: any = {}) =>
  useQuery({
    queryKey: deviceKeys.rebindRequests(filters),
    staleTime: 1000 * 30, // 30 seconds
    queryFn: () =>
      unwrapEden(
        apiClient.api.admin.devices["rebind-requests"].get({
          query: {
            status: filters.status || undefined,
            search: filters.search || undefined,
            page: filters.page ? String(filters.page) : undefined,
            limit: filters.limit ? String(filters.limit) : undefined,
          },
        }),
      ),
  });

export const useApproveRebindRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrapEden(apiClient.api.admin.devices["rebind-requests"]({ id }).approve.post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast.success("Re-bind request approved. The student can now bind their new phone.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve re-bind request");
    },
  });
};

export const useRejectRebindRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      unwrapEden(
        apiClient.api.admin.devices["rebind-requests"]({ id }).reject.post({
          note: note || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      toast.success("Re-bind request rejected.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject re-bind request");
    },
  });
};

export const useDeviceInventory = (filters: any = {}) =>
  useQuery({
    queryKey: deviceKeys.inventory(filters),
    staleTime: 1000 * 60, // 1 minute
    queryFn: () =>
      unwrapEden(
        apiClient.api.admin.devices.inventory.get({
          query: {
            boundStatus: filters.boundStatus || undefined,
            search: filters.search || undefined,
            page: filters.page ? String(filters.page) : undefined,
            limit: filters.limit ? String(filters.limit) : undefined,
          },
        }),
      ),
  });

export const useResetStudentDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentProfileId: string) =>
      unwrapEden(apiClient.api.admin.devices({ studentProfileId }).rebind.post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast.success("Device binding reset successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset device binding");
    },
  });
};

export const useBatchRebind = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentProfileIds: string[]) =>
      unwrapEden(
        apiClient.api.admin.devices["batch-rebind"].post({
          studentProfileIds,
        }),
      ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast.success(`Reset device bindings for ${data.count || "selected"} students.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to batch reset device bindings");
    },
  });
};

export const useRebindAndResolveAnomaly = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anomalyId: string) =>
      unwrapEden(apiClient.api.admin.anomalies({ id: anomalyId })["rebind-and-resolve"].post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Device reset and anomaly alert resolved.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset device and resolve anomaly");
    },
  });
};
