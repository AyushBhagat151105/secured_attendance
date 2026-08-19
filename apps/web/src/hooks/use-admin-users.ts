import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminUsersApi } from "@/api/admin-users";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
};

export const useUsers = (filters: Parameters<typeof adminUsersApi.listUsers>[0] = {}) =>
  useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => adminUsersApi.listUsers(filters),
  });

export const useUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => adminUsersApi.getUser(id),
    enabled: !!id,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: string }) => {
      const csv = `name,email,password,role\n${input.name},${input.email},${input.password},${input.role}`;
      const preview = await adminUsersApi.bulkImportPreview({
        type: input.role === "teacher" ? "teachers" : "students",
        csv,
      });
      const rows = preview?.parsed?.filter((r: { errors: string[] }) => r.errors.length === 0) ?? [];
      return adminUsersApi.bulkImportConfirm({
        type: input.role === "teacher" ? "teachers" : "students",
        rows,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success("User created successfully");
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminUsersApi.updateUser(id, body),
    onSuccess: (_, { id }) => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useSuspendUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminUsersApi.suspendUser,
    onSuccess: () => {
      toast.success("User suspended");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRebindDevice = () => {
  return useMutation({
    mutationFn: adminUsersApi.rebindDevice,
    onSuccess: () => {
      toast.success("Device binding reset");
    },
    onError: (err) => toast.error(err.message),
  });
};

export const usePreviewUsersImport = () => {
  return useMutation({
    mutationFn: adminUsersApi.bulkImportPreview,
  });
};

export const useConfirmUsersImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminUsersApi.bulkImportConfirm,
    onSuccess: (data) => {
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Created ${data.created}, skipped ${data.skipped}, errors: ${data.errors.length}`);
      } else {
        toast.success(`Import successful: ${data.created} created, ${data.skipped} skipped`);
      }
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
