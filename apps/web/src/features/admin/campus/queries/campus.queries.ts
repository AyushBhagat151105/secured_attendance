import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const api = apiClient.api;

// ─── Buildings ────────────────────────────────────────────────────────────────
export const buildingKeys = {
  all: ["buildings"] as const,
  detail: (id: string) => [...buildingKeys.all, id] as const,
};

export const useBuildings = () =>
  useQuery({
    queryKey: buildingKeys.all,
    queryFn: async () => {
      const { data, error } = await api.admin.campus.buildings.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch buildings");
      return data;
    },
  });

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.campus.buildings.post>[0]) => {
      const { data, error } = await api.admin.campus.buildings.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create building");
      return data;
    },
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
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const { data, error } = await api.admin.campus.buildings({ id }).patch(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to update building");
      return data;
    },
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
    queryFn: async () => {
      const { data, error } = await api.admin.campus.rooms.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch rooms");
      return data;
    },
  });

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.campus.rooms.post>[0]) => {
      const { data, error } = await api.admin.campus.rooms.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create room");
      return data;
    },
    onSuccess: () => {
      toast.success("Room created");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
