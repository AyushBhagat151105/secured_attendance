import { describe, expect, it, beforeEach } from "bun:test";
import {
  dispatchAppRequest,
  FIXTURES,
  inMemoryStore,
  resetInMemoryDb,
  setupInMemoryHarness,
} from "./test-setup";

describe("E2E Security & Guards: Role Access Control & Device Binding (In-Memory Isolation)", () => {
  beforeEach(() => {
    resetInMemoryDb();
    setupInMemoryHarness();
  });

  describe("Unauthenticated Access Restrictions", () => {
    it("1. Reject unauthenticated request to /api/student/profile with 401", async () => {
      const res = await dispatchAppRequest("/api/student/profile");
      expect(res.status).toBe(401);
    });

    it("2. Reject unauthenticated request to /api/teacher/schedule/today with 401", async () => {
      const res = await dispatchAppRequest("/api/teacher/schedule/today");
      expect(res.status).toBe(401);
    });

    it("3. Reject unauthenticated request to /api/admin/users with 401", async () => {
      const res = await dispatchAppRequest("/api/admin/users");
      expect(res.status).toBe(401);
    });
  });

  describe("Role Separation & Horizontal Privilege Restrictions", () => {
    it("4. Student cannot access /api/admin/users (403 Forbidden)", async () => {
      const res = await dispatchAppRequest("/api/admin/users", {
        asUser: FIXTURES.studentValid.user,
      });
      expect(res.status).toBe(403);
    });

    it("5. Student cannot access /api/teacher/sessions (403 Forbidden)", async () => {
      const res = await dispatchAppRequest("/api/teacher/sessions", {
        method: "POST",
        asUser: FIXTURES.studentValid.user,
        body: { timetableEntryId: FIXTURES.timetableEntry.id },
      });
      expect(res.status).toBe(403);
    });

    it("6. Teacher cannot access /api/admin/users (403 Forbidden)", async () => {
      const res = await dispatchAppRequest("/api/admin/users", {
        asUser: FIXTURES.teacherUser,
      });
      expect(res.status).toBe(403);
    });

    it("7. Student can access their own student profile (200 OK)", async () => {
      const res = await dispatchAppRequest("/api/student/profile", {
        asUser: FIXTURES.studentValid.user,
      });
      expect(res.status).toBe(200);
      expect(res.data.enrollmentNo).toBe(FIXTURES.studentValid.profile.enrollmentNo);
    });

    it("8. Super Admin can access /api/admin/users (200 OK)", async () => {
      const res = await dispatchAppRequest("/api/admin/users", {
        asUser: FIXTURES.adminUser,
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("users");
      expect(Array.isArray(res.data.users)).toBe(true);
    });
  });

  describe("Hardware Device Binding & Re-binding Lifecycle", () => {
    it("9. Admin can unbind a student device for re-registration", async () => {
      const studentId = FIXTURES.studentValid.user.id;
      const initialProfile = inMemoryStore.studentProfiles.get(studentId);
      expect(initialProfile.deviceBound).toBe(true);
      expect(initialProfile.deviceId).toBe("device-hw-fingerprint-001");

      const res = await dispatchAppRequest(`/api/admin/users/${studentId}/device-rebind`, {
        method: "POST",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const updatedProfile = inMemoryStore.studentProfiles.get(studentId);
      expect(updatedProfile.deviceBound).toBe(false);
      expect(updatedProfile.deviceId).toBeNull();
    });
  });
});
