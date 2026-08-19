import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminTimetableApi } from "@/api/admin-timetable";

// ─── Timetable Entries ────────────────────────────────────────────────────────
export const timetableKeys = {
  all: ["timetableEntries"] as const,
  detail: (id: string) => [...timetableKeys.all, id] as const,
};

export const useTimetableEntries = () =>
  useQuery({
    queryKey: timetableKeys.all,
    queryFn: adminTimetableApi.getEntries,
  });

export const useCreateTimetableEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminTimetableApi.createEntry,
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
    mutationFn: ({ id, body }: { id: string; body: any }) => adminTimetableApi.updateEntry(id, body),
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
    mutationFn: adminTimetableApi.deleteEntry,
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
    mutationFn: adminTimetableApi.previewImport,
  });
};

export const useConfirmTimetableImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminTimetableApi.confirmImport,
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
