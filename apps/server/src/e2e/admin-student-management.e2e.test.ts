import { describe, expect, it, beforeEach } from "bun:test";
import {
  dispatchAppRequest,
  FIXTURES,
  inMemoryStore,
  resetInMemoryDb,
  setupInMemoryHarness,
} from "./test-setup";

describe("E2E Admin Student Management Hub (In-Memory Isolation)", () => {
  beforeEach(() => {
    resetInMemoryDb();
    setupInMemoryHarness();
  });

  describe("Academic & Multi-Field Filtering", () => {
    it("1. Lists students filtered by role=student", async () => {
      const res = await dispatchAppRequest("/api/admin/users?role=student", {
        method: "GET",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      expect(res.data.users.length).toBeGreaterThan(0);
      for (const u of res.data.users) {
        expect(u.role).toBe("student");
      }
    });

    it("2. Filters students by enrollment number search query", async () => {
      const res = await dispatchAppRequest("/api/admin/users?search=26msit001", {
        method: "GET",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(res.data.users.length).toBe(1);
      expect(res.data.users[0].name).toBe("Ayush Bhagat");
      expect(res.data.users[0].studentProfile.enrollmentNo).toBe("26msit001");
    });

    it("3. Filters students by status=suspended", async () => {
      const res = await dispatchAppRequest("/api/admin/users?role=student&status=suspended", {
        method: "GET",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(res.data.users.length).toBe(1);
      expect(res.data.users[0].name).toBe("Devanshi Joshi");
      expect(res.data.users[0].studentProfile.status).toBe("suspended");
    });

    it("4. Filters students by divisionId", async () => {
      const res = await dispatchAppRequest(
        `/api/admin/users?role=student&divisionId=${FIXTURES.divisionB.id}`,
        {
          method: "GET",
          asUser: FIXTURES.adminUser,
        },
      );

      expect(res.status).toBe(200);
      expect(res.data.users.length).toBe(1);
      expect(res.data.users[0].name).toBe("Chirag Patel");
      expect(res.data.users[0].studentProfile.divisionId).toBe("div-msit-b");
    });
  });

  describe("Student Detail Sheet & Attendance Analytics API", () => {
    it("5. Fetches student details with profile and attendance calculations", async () => {
      // Seed a closed session and attendance for student 1
      const sessionId = "sess-closed-test-1";
      inMemoryStore.attendanceSessions.set(sessionId, {
        id: sessionId,
        status: "closed",
        startTime: new Date(Date.now() - 3600000),
        subject: FIXTURES.subject,
        sessionDivisions: [{ divisionId: FIXTURES.divisionA.id }],
      });

      const attId = `${sessionId}:${FIXTURES.studentValid.profile.id}`;
      inMemoryStore.attendances.set(attId, {
        id: "att-test-1",
        sessionId,
        studentProfileId: FIXTURES.studentValid.profile.id,
        timestamp: new Date(),
        gpsWithinGeofence: true,
        mockLocationFlag: false,
        anomalyFlags: [],
        session: {
          subject: FIXTURES.subject,
          room: FIXTURES.room,
          teacherProfile: FIXTURES.teacherProfile,
        },
      });

      const res = await dispatchAppRequest(
        `/api/admin/users/${FIXTURES.studentValid.user.id}/student-detail`,
        {
          method: "GET",
          asUser: FIXTURES.adminUser,
        },
      );

      expect(res.status).toBe(200);
      expect(res.data.user.id).toBe(FIXTURES.studentValid.user.id);
      expect(res.data.profile.enrollmentNo).toBe("26msit001");
      expect(res.data.stats).toBeDefined();
      expect(res.data.stats.totalConducted).toBe(1);
      expect(res.data.stats.totalAttended).toBe(1);
      expect(res.data.stats.overallPercentage).toBe(100);
      expect(res.data.recentAttendances).toBeDefined();
      expect(res.data.recentAttendances.length).toBe(1);
      expect(res.data.recentAttendances[0].gpsWithinGeofence).toBe(true);
    });

    it("6. Returns 404 when student detail is requested for non-existent student", async () => {
      const res = await dispatchAppRequest("/api/admin/users/non-existent-user/student-detail", {
        method: "GET",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Admin Password Override", () => {
    it("7. Admin can change a student's password and sets requiresPasswordChange", async () => {
      const res = await dispatchAppRequest(
        `/api/admin/users/${FIXTURES.studentValid.user.id}/change-password`,
        {
          method: "POST",
          asUser: FIXTURES.adminUser,
          body: {
            newPassword: "SuperSecurePassword123!",
            requiresPasswordChange: true,
          },
        },
      );

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.message).toBe("Password updated successfully");

      const studentUser = inMemoryStore.users.get(FIXTURES.studentValid.user.id);
      expect(studentUser.requiresPasswordChange).toBe(true);
    });

    it("8. Rejects password change with less than 8 characters", async () => {
      const res = await dispatchAppRequest(
        `/api/admin/users/${FIXTURES.studentValid.user.id}/change-password`,
        {
          method: "POST",
          asUser: FIXTURES.adminUser,
          body: {
            newPassword: "short",
          },
        },
      );

      expect(res.status).toBe(400); // Elysia validation error
    });
  });

  describe("Bulk Operations API", () => {
    it("9. Bulk updates user status to active/suspended", async () => {
      const userIds = [FIXTURES.studentValid.user.id, FIXTURES.studentDivB.user.id];

      const res = await dispatchAppRequest("/api/admin/users/bulk-status", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          userIds,
          status: "suspended",
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const s1 = inMemoryStore.studentProfiles.get(FIXTURES.studentValid.user.id);
      const s2 = inMemoryStore.studentProfiles.get(FIXTURES.studentDivB.user.id);
      expect(s1.status).toBe("suspended");
      expect(s2.status).toBe("suspended");
    });

    it("10. Bulk reassigns division for selected students", async () => {
      const userIds = [FIXTURES.studentValid.user.id];

      const res = await dispatchAppRequest("/api/admin/users/bulk-division", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          userIds,
          divisionId: FIXTURES.divisionB.id,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const s1 = inMemoryStore.studentProfiles.get(FIXTURES.studentValid.user.id);
      expect(s1.divisionId).toBe(FIXTURES.divisionB.id);
    });

    it("11. Bulk deletes selected user accounts", async () => {
      const userIds = [FIXTURES.studentSuspended.user.id];

      const res = await dispatchAppRequest("/api/admin/users/bulk-delete", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          userIds,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(inMemoryStore.users.has(FIXTURES.studentSuspended.user.id)).toBe(false);
    });
  });

  describe("Automatic Status Promotion on Physical Device Binding", () => {
    it("12. Automatically promotes student status from pending to active on device binding", async () => {
      // Set student to pending status initially
      const unboundProfile = inMemoryStore.studentProfiles.get(FIXTURES.studentUnbound.user.id);
      unboundProfile.status = "pending";

      const res = await dispatchAppRequest("/api/auth-custom/device-bind", {
        method: "POST",
        asUser: FIXTURES.studentUnbound.user,
        body: {
          deviceId: "new-hardware-uuid-999",
          deviceName: "Samsung Galaxy S24 Ultra",
          biometricEnabled: true,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const updated = inMemoryStore.studentProfiles.get(FIXTURES.studentUnbound.user.id);
      expect(updated.deviceBound).toBe(true);
      expect(updated.deviceId).toBe("new-hardware-uuid-999");
      expect(updated.deviceModel).toBe("Samsung Galaxy S24 Ultra");
      expect(updated.status).toBe("active"); // Automatically promoted to active!
    });
  });
});
