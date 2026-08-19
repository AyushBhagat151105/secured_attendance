import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminCampusApi } from "@/api/admin-campus";

// ─── Buildings ────────────────────────────────────────────────────────────────
export const buildingKeys = {
  all: ["buildings"] as const,
  detail: (id: string) => [...buildingKeys.all, id] as const,
};

export const useBuildings = () =>
  useQuery({
    queryKey: buildingKeys.all,
    queryFn: adminCampusApi.getBuildings,
  });

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCampusApi.createBuilding,
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
    mutationFn: ({ id, body }: { id: string; body: any }) => adminCampusApi.updateBuilding(id, body),
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
    queryFn: adminCampusApi.getRooms,
  });

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCampusApi.createRoom,
    onSuccess: () => {
      toast.success("Room created");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
