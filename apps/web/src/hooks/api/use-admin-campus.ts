import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";

// ─── Buildings ────────────────────────────────────────────────────────────────
export const buildingKeys = {
  all: ["buildings"] as const,
  detail: (id: string) => [...buildingKeys.all, id] as const,
};

export const useBuildings = () =>
  useQuery({
    queryKey: buildingKeys.all,
    queryFn: () => unwrapEden(apiClient.api.admin.campus.buildings.get()),
  });

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => unwrapEden(apiClient.api.admin.campus.buildings.post(body)),
    onSuccess: () => {
      toast.success("Building created");
      queryClient.invalidateQueries({ queryKey: buildingKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateBuilding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      unwrapEden(apiClient.api.admin.campus.buildings({ id }).patch(body)),
    onSuccess: (_, { id }) => {
      toast.success("Building updated");
      queryClient.invalidateQueries({ queryKey: buildingKeys.all });
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const roomKeys = {
  all: ["rooms"] as const,
  detail: (id: string) => [...roomKeys.all, id] as const,
};

export const useRooms = () =>
  useQuery({
    queryKey: roomKeys.all,
    queryFn: () => unwrapEden(apiClient.api.admin.campus.rooms.get()),
  });

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => unwrapEden(apiClient.api.admin.campus.rooms.post(body)),
    onSuccess: () => {
      toast.success("Room created");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      unwrapEden(apiClient.api.admin.campus.rooms({ id }).patch(body)),
    onSuccess: (_, { id }) => {
      toast.success("Room updated");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrapEden(apiClient.api.admin.campus.rooms({ id }).delete()),
    onSuccess: () => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
