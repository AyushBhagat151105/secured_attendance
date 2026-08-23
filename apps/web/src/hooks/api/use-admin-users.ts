import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
};

export const useUsers = (filters: any = {}) =>
  useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => unwrapEden(apiClient.api.admin.users.get({ query: filters })),
  });

export const useUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => unwrapEden(apiClient.api.admin.users({ id }).get()),
    enabled: !!id,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      if (input.role === "student") {
        return unwrapEden(apiClient.api.admin.users.student.post({
          name: input.name,
          email: input.email,
          enrollmentNo: input.enrollmentNo,
          programCode: input.programCode,
          semester: Number(input.semester),
          divisionId: input.divisionId,
        }));
      } else if (input.role === "teacher") {
        return unwrapEden(apiClient.api.admin.users.teacher.post({
          name: input.name,
          email: input.email,
          teacherCode: input.teacherCode,
          department: input.department,
        }));
      } else {
        return unwrapEden(apiClient.api.admin.users.admin.post({
          name: input.name,
          email: input.email,
        }));
      }
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
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrapEden(apiClient.api.admin.users({ id }).patch(body)),
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
    mutationFn: (id: string) => unwrapEden(apiClient.api.admin.users({ id }).suspend.post({})),
    onSuccess: () => {
      toast.success("User suspended");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapEden(apiClient.api.admin.users({ id }).delete()),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRebindDevice = () => {
  return useMutation({
    mutationFn: (userId: string) => unwrapEden(apiClient.api.admin.users({ id: userId })["device-rebind"].post({})),
    onSuccess: () => {
      toast.success("Device unbind token generated");
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useBulkImportPreview = () => {
  return useMutation({
    mutationFn: (body: any) => unwrapEden(apiClient.api.admin.users["bulk-import"].post(body)),
    onError: (err) => toast.error(err.message),
  });
};

export const useBulkImportConfirm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => unwrapEden(apiClient.api.admin.users["bulk-import"].confirm.post(body)),
    onSuccess: () => {
      toast.success("Users imported successfully");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) => toast.error(err.message),
  });
};
