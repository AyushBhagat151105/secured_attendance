import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const api = apiClient.api;

// ─── Timetable Entries ────────────────────────────────────────────────────────
export const timetableKeys = {
  all: ["timetableEntries"] as const,
  detail: (id: string) => [...timetableKeys.all, id] as const,
};

export const useTimetableEntries = () =>
  useQuery({
    queryKey: timetableKeys.all,
    queryFn: async () => {
      const { data, error } = await api.admin.timetable.entries.get();
      if (error) throw new Error((error.value as any)?.message || "Failed to fetch timetable entries");
      return data;
    },
  });

export const useCreateTimetableEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof api.admin.timetable.entries.post>[0]) => {
      const { data, error } = await api.admin.timetable.entries.post(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to create timetable entry");
      return data;
    },
    onSuccess: () => {
      toast.success("Class scheduled");
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateTimetableEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const { data, error } = await api.admin.timetable.entries({ id }).patch(body);
      if (error) throw new Error((error.value as any)?.message || "Failed to update timetable entry");
      return data;
    },
    onSuccess: (_, { id }) => {
      toast.success("Class updated");
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
      queryClient.invalidateQueries({ queryKey: timetableKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteTimetableEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.admin.timetable.entries({ id }).delete();
      if (error) throw new Error((error.value as any)?.message || "Failed to delete timetable entry");
      return data;
    },
    onSuccess: () => {
      toast.success("Class removed");
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Bulk Import ──────────────────────────────────────────────────────────────
export const usePreviewTimetableImport = () => {
  return useMutation({
    mutationFn: async (csv: string) => {
      const { data, error } = await api.admin.timetable.entries.import.preview.post({ csv });
      if (error) throw new Error((error.value as any)?.message || "Failed to preview import");
      return data;
    },
  });
};

export const useConfirmTimetableImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const { data, error } = await api.admin.timetable.entries.import.confirm.post({ rows });
      if (error) throw new Error((error.value as any)?.message || "Failed to confirm import");
      return data;
    },
    onSuccess: (data) => {
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Created ${data.created}, skipped ${data.skipped}, errors: ${data.errors.length}`);
      } else {
        toast.success(`Import successful: ${data.created} created, ${data.skipped} skipped`);
      }
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
