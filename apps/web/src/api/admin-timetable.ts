import { apiClient } from "@/lib/api-client";

const api = apiClient.api;

export const adminTimetableApi = {
  // Entries
  getEntries: async () => {
    const { data, error } = await api.admin.timetable.entries.get();
    if (error) throw new Error((error.value as any)?.message || "Failed to fetch timetable entries");
    return data;
  },
  createEntry: async (body: Parameters<typeof api.admin.timetable.entries.post>[0]) => {
    const { data, error } = await api.admin.timetable.entries.post(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to create timetable entry");
    return data;
  },
  updateEntry: async (id: string, body: any) => {
    const { data, error } = await api.admin.timetable.entries({ id }).patch(body);
    if (error) throw new Error((error.value as any)?.message || "Failed to update timetable entry");
    return data;
  },
  deleteEntry: async (id: string) => {
    const { data, error } = await api.admin.timetable.entries({ id }).delete();
    if (error) throw new Error((error.value as any)?.message || "Failed to delete timetable entry");
    return data;
  },

  // Bulk Import
  previewImport: async (csv: string) => {
    const { data, error } = await api.admin.timetable.entries.import.preview.post({ csv });
    if (error) throw new Error((error.value as any)?.message || "Failed to preview import");
    return data;
  },
  confirmImport: async (rows: any[]) => {
    const { data, error } = await api.admin.timetable.entries.import.confirm.post({ rows });
    if (error) throw new Error((error.value as any)?.message || "Failed to confirm import");
    return data;
  },
};
