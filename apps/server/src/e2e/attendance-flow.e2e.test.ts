import { describe, expect, it, beforeEach } from "bun:test";
import { defaultQrTokenManager } from "../domain/qr-token-manager";
import {
  dispatchAppRequest,
  FIXTURES,
  inMemoryStore,
  resetInMemoryDb,
  setupInMemoryHarness,
} from "./test-setup";

describe("E2E Simulation: Complete Attendance Lifecycle (In-Memory Isolation)", () => {
  beforeEach(() => {
    resetInMemoryDb();
    setupInMemoryHarness();
  });

  it("1. Teacher successfully starts an attendance session with building geofence", async () => {
    const res = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: {
        timetableEntryId: FIXTURES.timetableEntry.id,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("id");
    expect(res.data.status).toBe("active");
    expect(res.data.room.building.code).toBe("CMPICA");

    const sessionInDb = inMemoryStore.attendanceSessions.get(res.data.id);
    expect(sessionInDb).toBeDefined();
    expect(sessionInDb.timetableEntryId).toBe(FIXTURES.timetableEntry.id);
  });

  it("2. Valid student check-in with bound device inside geofence returns 200 OK", async () => {
    // Start session
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    // Issue rotating QR batch
    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret, {
      count: 2,
      intervalMs: 10_000,
      validityMs: 45_000,
    });
    const token = tokens[0]!;

    // Student 1 scans within building geofence (22.5995, 72.8205)
    const scanRes = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 8,
        mockFlag: false,
      },
    });

    expect(scanRes.status).toBe(200);
    expect(scanRes.data.success).toBe(true);

    const attendanceKey = `${sessionId}:${FIXTURES.studentValid.profile.id}`;
    expect(inMemoryStore.attendances.has(attendanceKey)).toBe(true);
  });

  it("3. Duplicate scan attempt by same student is rejected with 400 Bad Request", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    const payload = {
      sessionId,
      nonce: token.nonce,
      signature: token.signature,
      expiresAt: token.expiresAt,
      deviceFingerprint: "device-hw-fingerprint-001",
      gpsLat: 22.5995,
      gpsLng: 72.8205,
      gpsAccuracy: 10,
      mockFlag: false,
    };

    // First scan succeeds
    const firstScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: payload,
    });
    expect(firstScan.status).toBe(200);

    // Second scan fails with ALREADY_MARKED
    const duplicateScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: payload,
    });
    expect(duplicateScan.status).toBe(400);
    expect(duplicateScan.data.message).toContain("already marked");
  });

  it("4. Device mismatch is rejected with 403 Forbidden and logs an anomaly", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    // Student 1 scanning from an unapproved friend's phone
    const mismatchScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "foreign-unapproved-phone-xyz",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 5,
        mockFlag: false,
      },
    });

    expect(mismatchScan.status).toBe(403);
    expect(mismatchScan.data.message).toContain("authorized");

    const anomaly = inMemoryStore.anomalies.find((a) => a.type === "DEVICE_MISMATCH");
    expect(anomaly).toBeDefined();
  });

  it("5. Mock location / GPS spoofing is rejected with 400 Bad Request", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    const spoofScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 5,
        mockFlag: true, // Mock location provider flagged
      },
    });

    expect(spoofScan.status).toBe(400);
    expect(spoofScan.data.message.toLowerCase()).toContain("location");
  });

  it("6. Outside geofence is rejected with 400 Bad Request and logs an anomaly", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    // Coordinates ~1.5 km away from CMPICA Building
    const outsideScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.615,
        gpsLng: 72.835,
        gpsAccuracy: 10,
        mockFlag: false,
      },
    });

    expect(outsideScan.status).toBe(400);
    expect(outsideScan.data.message).toContain("outside classroom");

    const anomaly = inMemoryStore.anomalies.find((a) => a.type === "GEOFENCE_VIOLATION");
    expect(anomaly).toBeDefined();
  });

  it("7. Student not enrolled in session division is rejected with 403 Forbidden", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    // Student from Division B attempts to scan for Division A session
    const notEnrolledScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentDivB.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-003",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 10,
        mockFlag: false,
      },
    });

    expect(notEnrolledScan.status).toBe(403);
    expect(notEnrolledScan.data.message).toContain("not enrolled");
  });

  it("8. Suspended student is rejected with 403 Forbidden", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    const token = tokens[0]!;

    const suspendedScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentSuspended.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-004",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 10,
        mockFlag: false,
      },
    });

    expect(suspendedScan.status).toBe(403);
    expect(suspendedScan.data.message).toContain("suspended");
  });

  it("9. Offline sync: valid scan timestamp within grace window is accepted", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret, {
      validityMs: 45_000,
    });
    const token = tokens[0]!;

    // Offline scan captured while token was valid (scannedAt was 5s ago)
    const now = Date.now();
    const offlineScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 10,
        mockFlag: false,
        isOfflineSync: true,
        scannedAt: now - 5_000,
      },
    });

    expect(offlineScan.status).toBe(200);
    expect(offlineScan.data.success).toBe(true);

    const attendance = inMemoryStore.attendances.get(`${sessionId}:${FIXTURES.studentValid.profile.id}`);
    expect(attendance).toBeDefined();
    expect(attendance.anomalyFlags).toContain("offline_sync");
  });

  it("10. Offline sync: expired scan timestamp beyond grace window is rejected with 400", async () => {
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret, {
      validityMs: 45_000,
    });
    const token = tokens[0]!;

    // Scan timestamp was taken 60s AFTER token expired
    const expiredScanTimestamp = token.expiresAt + 60_000;

    const offlineExpiredScan = await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: token.nonce,
        signature: token.signature,
        expiresAt: token.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 10,
        mockFlag: false,
        isOfflineSync: true,
        scannedAt: expiredScanTimestamp,
      },
    });

    expect(offlineExpiredScan.status).toBe(400);
    expect(offlineExpiredScan.data.message).toContain("expired");
  });

  it("11. Teacher finalizes roster with manual overrides in atomic transaction", async () => {
    // Start session
    const sessionRes = await dispatchAppRequest("/api/teacher/sessions", {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: { timetableEntryId: FIXTURES.timetableEntry.id },
    });
    const sessionId = sessionRes.data.id;
    const sessionSecret = inMemoryStore.attendanceSessions.get(sessionId).sessionSecret;

    // Student 1 scanned via QR
    const tokens = await defaultQrTokenManager.issueBatch(sessionId, sessionSecret);
    await dispatchAppRequest("/api/student/attendance/scan", {
      method: "POST",
      asUser: FIXTURES.studentValid.user,
      body: {
        sessionId,
        nonce: tokens[0]!.nonce,
        signature: tokens[0]!.signature,
        expiresAt: tokens[0]!.expiresAt,
        deviceFingerprint: "device-hw-fingerprint-001",
        gpsLat: 22.5995,
        gpsLng: 72.8205,
        gpsAccuracy: 10,
        mockFlag: false,
      },
    });

    // Teacher reviews and finalizes: marks student 1 (QR) and student 2 (manual override) present
    const finalizeRes = await dispatchAppRequest(`/api/teacher/sessions/${sessionId}/finalize`, {
      method: "POST",
      asUser: FIXTURES.teacherUser,
      body: {
        presentStudentIds: [
          FIXTURES.studentValid.profile.id,
          FIXTURES.studentUnbound.profile.id, // Manually marked present
        ],
      },
    });

    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.data.success).toBe(true);
    expect(finalizeRes.data.totalPresent).toBe(2);

    const session = inMemoryStore.attendanceSessions.get(sessionId);
    expect(session.status).toBe("closed");

    // Verify manual override flag on student 2
    const manualAttendance = inMemoryStore.attendances.get(
      `${sessionId}:${FIXTURES.studentUnbound.profile.id}`,
    );
    expect(manualAttendance).toBeDefined();
    expect(manualAttendance.anomalyFlags).toContain("manual_teacher_override");
  });
});
