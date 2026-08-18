import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "teacher" | "admin" | "super_admin";
export type UserStatus = "active" | "suspended" | "pending";

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: UserRole | "";
  search?: string;
  status?: UserStatus | "";
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface BulkImportInput {
  type: "students" | "teachers";
  csv: string;
}

export interface BulkImportConfirmInput {
  type: "students" | "teachers";
  rows: unknown[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * AdminUsersService — thin wrapper over the Eden Treaty client for user management.
 * All methods check the `error` field before returning data (Eden pattern).
 */
class AdminUsersService {
  /**
   * List users with optional filtering and pagination.
   */
  async listUsers(params: UserListParams = {}) {
    const { data, error } = await apiClient.api.admin.users.get({
      query: {
        page: params.page,
        limit: params.limit,
        role: params.role,
        search: params.search,
        status: params.status,
      },
    });

    if (error) throw new Error(error.value?.message ?? "Failed to fetch users");
    return data;
  }

  /**
   * Get a single user by ID with full profile details.
   */
  async getUser(id: string) {
    const { data, error } = await apiClient.api.admin.users({ id }).get();

    if (error) throw new Error(error.value?.message ?? "Failed to fetch user");
    return data;
  }

  /**
   * Update user fields (name, role, or status).
   */
  async updateUser(id: string, input: UpdateUserInput) {
    const { data, error } = await apiClient.api.admin.users({ id }).patch(input);

    if (error) throw new Error(error.value?.message ?? "Failed to update user");
    return data;
  }

  /**
   * Suspend a user (soft delete — marks studentProfile.status = 'suspended').
   */
  async suspendUser(id: string) {
    const { data, error } = await apiClient.api.admin.users({ id }).delete();

    if (error) throw new Error(error.value?.message ?? "Failed to suspend user");
    return data;
  }

  /**
   * Reset a student's device binding so they can re-register from a new device.
   */
  async rebindDevice(userId: string) {
    const { data, error } = await apiClient.api.admin.users({ id: userId })["device-rebind"].post(
      {},
    );

    if (error) throw new Error(error.value?.message ?? "Failed to rebind device");
    return data;
  }

  /**
   * Parse a CSV string and return a preview of rows with validation errors.
   * No DB writes — safe to call multiple times.
   */
  async bulkImportPreview(input: BulkImportInput) {
    const { data, error } = await apiClient.api.admin.users["bulk-import"].post(input);

    if (error) throw new Error(error.value?.message ?? "Failed to parse CSV");
    return data;
  }

  /**
   * Confirm and persist the bulk import rows returned from preview.
   */
  async bulkImportConfirm(input: BulkImportConfirmInput) {
    const { data, error } = await apiClient.api.admin.users["bulk-import"].confirm.post(input);

    if (error) throw new Error(error.value?.message ?? "Failed to create users");
    return data;
  }
}

// Export singleton instance
export const adminUsersService = new AdminUsersService();
