import { apiClient } from "@/lib/api-client";

const api = apiClient.api;

export const adminUsersApi = {
  listUsers: async (query: NonNullable<Parameters<typeof api.admin.users.get>[0]>["query"]) => {
    const { data, error } = await api.admin.users.get({ query });
    if (error) throw new Error(error.value?.message ?? "Failed to fetch users");
    return data;
  },

  getUser: async (id: string) => {
    const { data, error } = await api.admin.users({ id }).get();
    if (error) throw new Error(error.value?.message ?? "Failed to fetch user");
    return data;
  },

  createStudent: async (body: Parameters<typeof api.admin.users.student.post>[0]) => {
    const { data, error } = await api.admin.users.student.post(body);
    if (error) throw new Error(error.value?.message ?? "Failed to create student");
    return data;
  },

  createTeacher: async (body: Parameters<typeof api.admin.users.teacher.post>[0]) => {
    const { data, error } = await api.admin.users.teacher.post(body);
    if (error) throw new Error(error.value?.message ?? "Failed to create teacher");
    return data;
  },

  createAdmin: async (body: Parameters<typeof api.admin.users.admin.post>[0]) => {
    const { data, error } = await api.admin.users.admin.post(body);
    if (error) throw new Error(error.value?.message ?? "Failed to create admin");
    return data;
  },

  updateUser: async (id: string, body: Parameters<ReturnType<typeof api.admin.users>["patch"]>[0]) => {
    const { data, error } = await api.admin.users({ id }).patch(body);
    if (error) throw new Error(error.value?.message ?? "Failed to update user");
    return data;
  },

  suspendUser: async (id: string) => {
    const { data, error } = await api.admin.users({ id }).suspend.post({});
    if (error) throw new Error(error.value?.message ?? "Failed to suspend user");
    return data;
  },

  deleteUser: async (id: string) => {
    const { data, error } = await api.admin.users({ id }).delete();
    if (error) throw new Error(error.value?.message ?? "Failed to delete user");
    return data;
  },

  rebindDevice: async (userId: string) => {
    const { data, error } = await api.admin.users({ id: userId })["device-rebind"].post({});
    if (error) throw new Error(error.value?.message ?? "Failed to rebind device");
    return data;
  },

  bulkImportPreview: async (body: Parameters<typeof api.admin.users["bulk-import"]["post"]>[0]) => {
    const { data, error } = await api.admin.users["bulk-import"].post(body);
    if (error) throw new Error(error.value?.message ?? "Failed to parse CSV");
    return data;
  },

  bulkImportConfirm: async (body: Parameters<typeof api.admin.users["bulk-import"]["confirm"]["post"]>[0]) => {
    const { data, error } = await api.admin.users["bulk-import"].confirm.post(body);
    if (error) throw new Error(error.value?.message ?? "Failed to create users");
    return data;
  },
};
