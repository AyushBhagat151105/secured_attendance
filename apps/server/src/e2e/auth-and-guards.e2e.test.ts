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

    it("10. Student can submit a device re-bind request with reason and hardware details", async () => {
      const student = FIXTURES.studentValid;
      const res = await dispatchAppRequest("/api/student/device/rebind-request", {
        method: "POST",
        asUser: student.user,
        body: {
          requestedDeviceId: "device-hw-pixel-8-new",
          requestedDeviceModel: "Google Pixel 8",
          requestedDeviceOs: "Android 15",
          reason: "Upgraded to a new phone",
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.request.status).toBe("PENDING");
      expect(res.data.request.requestedDeviceModel).toBe("Google Pixel 8");

      // Verify status endpoint reflects pending request
      const statusRes = await dispatchAppRequest("/api/student/device/rebind-request/status", {
        asUser: student.user,
      });
      expect(statusRes.status).toBe(200);
      expect(statusRes.data.hasPending).toBe(true);
      expect(statusRes.data.request.requestedDeviceId).toBe("device-hw-pixel-8-new");
    });

    it("11. Student cannot submit a duplicate re-bind request while one is pending", async () => {
      const student = FIXTURES.studentValid;
      // First request
      await dispatchAppRequest("/api/student/device/rebind-request", {
        method: "POST",
        asUser: student.user,
        body: {
          requestedDeviceId: "device-hw-pixel-8-new",
          requestedDeviceModel: "Google Pixel 8",
          reason: "Upgraded phone",
        },
      });

      // Second request should be rejected
      const duplicateRes = await dispatchAppRequest("/api/student/device/rebind-request", {
        method: "POST",
        asUser: student.user,
        body: {
          requestedDeviceId: "device-hw-pixel-8-new",
          requestedDeviceModel: "Google Pixel 8",
          reason: "Upgraded phone again",
        },
      });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.data.message).toContain("already pending");
    });

    it("12. Admin can list, approve re-bind requests, and unbind student phone", async () => {
      const student = FIXTURES.studentValid;
      // Student requests rebind
      const reqRes = await dispatchAppRequest("/api/student/device/rebind-request", {
        method: "POST",
        asUser: student.user,
        body: {
          requestedDeviceId: "device-hw-s24-ultra",
          requestedDeviceModel: "Samsung Galaxy S24 Ultra",
          reason: "Screen cracked, got replacement",
        },
      });
      const requestId = reqRes.data.request.id;

      // Admin lists requests
      const listRes = await dispatchAppRequest("/api/admin/devices/rebind-requests", {
        asUser: FIXTURES.adminUser,
      });
      expect(listRes.status).toBe(200);
      expect(listRes.data.items.length).toBeGreaterThan(0);

      // Admin approves request
      const approveRes = await dispatchAppRequest(
        `/api/admin/devices/rebind-requests/${requestId}/approve`,
        {
          method: "POST",
          asUser: FIXTURES.adminUser,
        },
      );
      expect(approveRes.status).toBe(200);
      expect(approveRes.data.success).toBe(true);

      // Verify student profile is now unbound
      const profile = inMemoryStore.studentProfiles.get(student.user.id);
      expect(profile.deviceBound).toBe(false);
      expect(profile.deviceId).toBeNull();
    });

    it("13. Admin can reject re-bind request with reason note", async () => {
      const student = FIXTURES.studentValid;
      const reqRes = await dispatchAppRequest("/api/student/device/rebind-request", {
        method: "POST",
        asUser: student.user,
        body: {
          requestedDeviceId: "device-hw-suspicious",
          requestedDeviceModel: "Unknown Phone",
          reason: "Testing",
        },
      });
      const requestId = reqRes.data.request.id;

      const rejectRes = await dispatchAppRequest(
        `/api/admin/devices/rebind-requests/${requestId}/reject`,
        {
          method: "POST",
          asUser: FIXTURES.adminUser,
          body: { note: "Please visit CMPICA administrative office in person" },
        },
      );
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.data.success).toBe(true);
      expect(rejectRes.data.request.status).toBe("REJECTED");
      expect(rejectRes.data.request.reviewNote).toContain("CMPICA administrative office");

      // Verify student device is NOT unbound
      const profile = inMemoryStore.studentProfiles.get(student.user.id);
      expect(profile.deviceBound).toBe(true);
    });

    it("14. Admin can reset student device from device inventory", async () => {
      const student = FIXTURES.studentValid;
      const profileId = student.profile.id;

      const res = await dispatchAppRequest(`/api/admin/devices/${profileId}/rebind`, {
        method: "POST",
        asUser: FIXTURES.adminUser,
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const profile = inMemoryStore.studentProfiles.get(profileId);
      expect(profile.deviceBound).toBe(false);
    });

    it("15. Device inventory supports pagination and filters", async () => {
      const res = await dispatchAppRequest("/api/admin/devices/inventory?page=1&limit=10", {
        asUser: FIXTURES.adminUser,
      });
      expect(res.status).toBe(200);
      expect(res.data.page).toBe(1);
      expect(res.data.limit).toBe(10);
      expect(res.data.counts).toBeDefined();
      expect(Array.isArray(res.data.items)).toBe(true);
    });

    it("16. Device rebind-requests support pagination and status filtering", async () => {
      const res = await dispatchAppRequest(
        "/api/admin/devices/rebind-requests?page=1&limit=5&status=ALL",
        {
          asUser: FIXTURES.adminUser,
        },
      );
      expect(res.status).toBe(200);
      expect(res.data.page).toBe(1);
      expect(res.data.limit).toBe(5);
      expect(res.data.counts).toBeDefined();
      expect(Array.isArray(res.data.items)).toBe(true);
    });
  });
});
