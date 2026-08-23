import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";

// ─── Timetable Entries ────────────────────────────────────────────────────────
export const timetableKeys = {
  all: ["timetableEntries"] as const,
  detail: (id: string) => [...timetableKeys.all, id] as const,
};

export const useTimetableEntries = () =>
  useQuery({
    queryKey: timetableKeys.all,
    queryFn: () => unwrapEden(apiClient.api.admin.timetable.entries.get()),
  });

export const useCreateTimetableEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => unwrapEden(apiClient.api.admin.timetable.entries.post(body)),
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
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrapEden(apiClient.api.admin.timetable.entries({ id }).patch(body)),
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
    mutationFn: (id: string) => unwrapEden(apiClient.api.admin.timetable.entries({ id }).delete()),
    onSuccess: () => {
      toast.success("Class removed");
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

// â”€â”€â”€ Bulk Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const usePreviewTimetableImport = () => {
  return useMutation({
    mutationFn: (csv: string) => unwrapEden(apiClient.api.admin.timetable.entries.import.preview.post({ csv })),
  });
};

export const useConfirmTimetableImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => unwrapEden(apiClient.api.admin.timetable.entries.import.confirm.post({ rows })),
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
