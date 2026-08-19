import { apiClient } from "@/lib/api-client";

const api = apiClient.api;

export const adminCampusApi = {
  // Buildings
  getBuildings: async () => {
    const { data, error } = await api.admin.campus.buildings.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch buildings");
    return data;
  },
  createBuilding: async (body: Parameters<typeof api.admin.campus.buildings.post>[0]) => {
    const { data, error } = await api.admin.campus.buildings.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create building");
    return data;
  },
  updateBuilding: async (id: string, body: any) => {
    const { data, error } = await api.admin.campus.buildings({ id }).patch(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to update building");
    return data;
  },

  // Rooms
  getRooms: async () => {
    const { data, error } = await api.admin.campus.rooms.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch rooms");
    return data;
  },
  createRoom: async (body: Parameters<typeof api.admin.campus.rooms.post>[0]) => {
    const { data, error } = await api.admin.campus.rooms.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create room");
    return data;
  },
};
