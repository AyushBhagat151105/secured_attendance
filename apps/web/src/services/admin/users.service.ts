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
  programCode?: string;
  programId?: string;
  academicYearId?: string;
  semester?: number;
  divisionId?: string;
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
        programCode: params.programCode,
        programId: params.programId,
        academicYearId: params.academicYearId,
        semester: params.semester,
        divisionId: params.divisionId,
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
    const { data, error } = await apiClient.api.admin
      .users({ id: userId })
      ["device-rebind"].post({});

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

  /**
   * Get detailed student profile, academic hierarchy, and attendance scores/history.
   */
  async getStudentDetail(id: string) {
    const { data, error } = await apiClient.api.admin.users({ id })["student-detail"].get();

    if (error) throw new Error(error.value?.message ?? "Failed to fetch student details");
    return data;
  }

  /**
   * Admin changes a user's password directly.
   */
  async changePassword(id: string, newPassword: string, requiresPasswordChange = true) {
    const { data, error } = await apiClient.api.admin.users({ id })["change-password"].post({
      newPassword,
      requiresPasswordChange,
    });

    if (error) throw new Error(error.value?.message ?? "Failed to change password");
    return data;
  }

  /**
   * Bulk delete selected users.
   */
  async bulkDelete(userIds: string[]) {
    const { data, error } = await apiClient.api.admin.users["bulk-delete"].post({ userIds });

    if (error) throw new Error(error.value?.message ?? "Failed to delete users");
    return data;
  }

  /**
   * Bulk update status for selected users.
   */
  async bulkStatus(userIds: string[], status: UserStatus) {
    const { data, error } = await apiClient.api.admin.users["bulk-status"].post({ userIds, status });

    if (error) throw new Error(error.value?.message ?? "Failed to update status");
    return data;
  }

  /**
   * Bulk assign division to selected students.
   */
  async bulkDivision(userIds: string[], divisionId: string) {
    const { data, error } = await apiClient.api.admin.users["bulk-division"].post({
      userIds,
      divisionId,
    });

    if (error) throw new Error(error.value?.message ?? "Failed to assign division");
    return data;
  }
}

// Export singleton instance
export const adminUsersService = new AdminUsersService();
