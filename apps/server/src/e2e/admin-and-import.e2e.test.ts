import { describe, expect, it, beforeEach } from "bun:test";
import {
  dispatchAppRequest,
  FIXTURES,
  inMemoryStore,
  resetInMemoryDb,
  setupInMemoryHarness,
} from "./test-setup";

describe("E2E Admin Operations & Bulk CSV Import (In-Memory Isolation)", () => {
  beforeEach(() => {
    resetInMemoryDb();
    setupInMemoryHarness();
  });

  describe("CSV Bulk Import Parsing & Validation", () => {
    it("1. Student CSV preview parses valid rows with 3-digit and 4-digit roll numbers", async () => {
      const csv = `enrollment_no,name,email,program_code,semester,division
26msit006,Siddharth Patel,26msit006@charusat.edu.in,msit,1,Div-A
26msit1007,Pooja Dave,26msit1007@charusat.edu.in,msit,1,Div-B`;

      const res = await dispatchAppRequest("/api/admin/users/bulk-import", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          type: "students",
          csv,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.type).toBe("students");
      expect(res.data.validCount).toBe(2);
      expect(res.data.invalidCount).toBe(0);
      expect(res.data.parsed[0].enrollmentNo).toBe("26msit006");
      expect(res.data.parsed[1].enrollmentNo).toBe("26msit1007");
    });

    it("2. Student CSV preview flags malformed rows with specific field errors", async () => {
      const csv = `enrollment_no,name,email,program_code,semester,division
invalid-enroll,Ayush Bhagat,,msit,first,Div-A
26msit008,,26msit008@charusat.edu.in,msit,1,`;

      const res = await dispatchAppRequest("/api/admin/users/bulk-import", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          type: "students",
          csv,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.validCount).toBe(0);
      expect(res.data.invalidCount).toBe(2);

      const row1 = res.data.parsed[0];
      expect(row1.errors).toContain("email is required");
      expect(row1.errors).toContain("Invalid enrollment_no format (expected: 26msit006)");
      expect(row1.errors).toContain("semester must be a number");

      const row2 = res.data.parsed[1];
      expect(row2.errors).toContain("name is required");
      expect(row2.errors).toContain("division is required");
    });

    it("3. Teacher CSV preview parses valid teacher rows", async () => {
      const csv = `code,name,email,department
KRP,Prof. Keyur Patel,krp@charusat.ac.in,Computer Applications`;

      const res = await dispatchAppRequest("/api/admin/users/bulk-import", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          type: "teachers",
          csv,
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.validCount).toBe(1);
      expect(res.data.invalidCount).toBe(0);
      expect(res.data.parsed[0].code).toBe("KRP");
      expect(res.data.parsed[0].department).toBe("Computer Applications");
    });

    it("4. Empty CSV returns 400 Bad Request", async () => {
      const res = await dispatchAppRequest("/api/admin/users/bulk-import", {
        method: "POST",
        asUser: FIXTURES.adminUser,
        body: {
          type: "students",
          csv: "   ",
        },
      });

      expect(res.status).toBe(400);
    });

    it("5. Non-admin user cannot access bulk import (403 Forbidden)", async () => {
      const res = await dispatchAppRequest("/api/admin/users/bulk-import", {
        method: "POST",
        asUser: FIXTURES.studentValid.user,
        body: {
          type: "students",
          csv: "enrollment_no,name,email,program_code,semester,division\n26msit001,Test,t@c.in,msit,1,A",
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe("User Lifecycle Management", () => {
    it("6. Admin can suspend a student user", async () => {
      const studentId = FIXTURES.studentValid.user.id;

      const res = await dispatchAppRequest(`/api/admin/users/${studentId}/suspend`, {
        method: "POST",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const user = inMemoryStore.users.get(studentId);
      expect(user.banned).toBe(true);

      const profile = inMemoryStore.studentProfiles.get(studentId);
      expect(profile.status).toBe("suspended");
    });

    it("7. Admin can update user details", async () => {
      const studentId = FIXTURES.studentValid.user.id;

      const res = await dispatchAppRequest(`/api/admin/users/${studentId}`, {
        method: "PATCH",
        asUser: FIXTURES.adminUser,
        body: {
          name: "Ayush P. Bhagat",
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.name).toBe("Ayush P. Bhagat");

      const user = inMemoryStore.users.get(studentId);
      expect(user.name).toBe("Ayush P. Bhagat");
    });

    it("8. Admin can delete a user", async () => {
      const studentId = FIXTURES.studentUnbound.user.id;
      expect(inMemoryStore.users.has(studentId)).toBe(true);

      const res = await dispatchAppRequest(`/api/admin/users/${studentId}`, {
        method: "DELETE",
        asUser: FIXTURES.adminUser,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(inMemoryStore.users.has(studentId)).toBe(false);
    });
  });
});
