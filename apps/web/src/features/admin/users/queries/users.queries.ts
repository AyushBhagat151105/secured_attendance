import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  type BulkImportConfirmInput,
  type BulkImportInput,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListParams,
  adminUsersService,
} from "@/services/admin/users.service";

// ─── Query Keys ──────────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for consistent cache management.
 * Follows TanStack Query best practices: [domain, scope, params]
 */
export const usersKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (params: UserListParams) => [...usersKeys.lists(), params] as const,
  details: () => [...usersKeys.all, "detail"] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
};

// ─── Query Options ────────────────────────────────────────────────────────────

/**
 * queryOptions factory for the user list — usable in route loaders and hooks.
 */
export function usersListQueryOptions(params: UserListParams = {}) {
  return queryOptions({
    queryKey: usersKeys.list(params),
    queryFn: () => adminUsersService.listUsers(params),
    staleTime: 30 * 1000, // 30s — user lists can change frequently
  });
}

/**
 * queryOptions factory for a single user detail.
 */
export function userDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: usersKeys.detail(id),
    queryFn: () => adminUsersService.getUser(id),
    enabled: Boolean(id),
  });
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Hook for paginated, filtered user list.
 */
export function useUsersQuery(params: UserListParams = {}) {
  return useQuery(usersListQueryOptions(params));
}

/**
 * Hook for a single user detail page.
 */
export function useUserQuery(id: string) {
  return useQuery(userDetailQueryOptions(id));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new user. Invalidates the user list on success.
 */
export function useCreateUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      // Create via Better Auth's admin API (or direct endpoint if added)
      // For now we use bulk import with a single row as a workaround
      const csv = `name,email,password,role\n${input.name},${input.email},${input.password},${input.role}`;
      const preview = await adminUsersService.bulkImportPreview({
        type: input.role === "teacher" ? "teachers" : "students",
        csv,
      });
      const rows = preview?.parsed?.filter((r: { errors: string[] }) => r.errors.length === 0) ?? [];
      return adminUsersService.bulkImportConfirm({
        type: input.role === "teacher" ? "teachers" : "students",
        rows,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success("User created successfully");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create user");
    },
  });
}

/**
 * Updates user fields (name, role, status). Invalidates list and detail caches.
 */
export function useUpdateUserMutation(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => adminUsersService.updateUser(userId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.lists() });
      void qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      toast.success("User updated");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update user");
    },
  });
}

/**
 * Suspends a user (soft delete). Invalidates the list.
 */
export function useSuspendUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUsersService.suspendUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success("User suspended");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to suspend user");
    },
  });
}

/**
 * Resets a student's device binding. Invalidates detail cache.
 */
export function useRebindDeviceMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUsersService.rebindDevice(userId),
    onSuccess: (_, userId) => {
      void qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      void qc.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success("Device binding reset — student can re-register from a new device");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to reset device binding");
    },
  });
}

/**
 * Two-phase bulk import mutation.
 * Phase 1: preview — parses CSV and returns rows with validation errors.
 * Phase 2: confirm — persists the valid rows.
 */
export function useBulkImportPreviewMutation() {
  return useMutation({
    mutationFn: (input: BulkImportInput) => adminUsersService.bulkImportPreview(input),
    onError: (err) => {
      toast.error(err.message ?? "Failed to parse CSV");
    },
  });
}

export function useBulkImportConfirmMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkImportConfirmInput) => adminUsersService.bulkImportConfirm(input),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(
        `Import complete: ${data?.created ?? 0} created, ${data?.skipped ?? 0} skipped`,
      );
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to import users");
    },
  });
}
