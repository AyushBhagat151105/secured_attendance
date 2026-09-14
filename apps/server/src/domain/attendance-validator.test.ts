import { describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import { AttendanceValidator, getDistanceInMeters, type ScanContext } from "./attendance-validator";

function createValidContext(overrides?: Partial<ScanContext>): ScanContext {
  const sessionSecret = "institutional-super-secret-key-12345";
  const sessionId = "session-test-001";
  const nonce = "nonce-abc-123";
  const expiresAt = Date.now() + 30000; // valid for 30s

  const payloadString = `${sessionId}:${nonce}:${expiresAt}`;
  const validSignature = crypto
    .createHmac("sha256", sessionSecret)
    .update(payloadString)
    .digest("hex");

  const base: ScanContext = {
    userId: "user-student-1",
    studentProfileId: "profile-student-1",
    divisionId: "division-mca-a",
    deviceBound: true,
    boundDeviceId: "device-hw-fingerprint-999",
    detectedFingerprint: "device-hw-fingerprint-999",
    mockFlag: false,
    session: {
      id: sessionId,
      status: "active",
      createdAt: new Date(Date.now() - 60000), // created 1 min ago
      sessionSecret,
      sessionDivisions: [{ divisionId: "division-mca-a" }],
      room: {
        building: {
          name: "CSPIT Building",
          gpsLat: 22.5996,
          gpsLng: 72.8205,
          radiusMeters: 50,
        },
      },
    },
    token: {
      nonce,
      signature: validSignature,
      expiresAt,
      tokenFoundInCacheOrDb: true,
      tokenDbExpired: false,
    },
    attendanceAlreadyMarked: false,
    gps: {
      lat: 22.5996,
      lng: 72.8205,
      accuracy: 10,
    },
    isOfflineSync: false,
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("AttendanceValidator — Pure Domain Engine", () => {
  describe("getDistanceInMeters", () => {
    it("returns 0 for identical coordinates", () => {
      const d = getDistanceInMeters(22.5996, 72.8205, 22.5996, 72.8205);
      expect(Math.round(d)).toBe(0);
    });

    it("calculates realistic distance across GPS coordinates", () => {
      // ~111 meters per 0.001 deg latitude
      const d = getDistanceInMeters(22.599, 72.8205, 22.6, 72.8205);
      expect(d).toBeGreaterThan(100);
      expect(d).toBeLessThan(120);
    });
  });

  describe("AttendanceValidator.evaluate", () => {
    it("accepts a valid scan within classroom geofence", () => {
      const ctx = createValidContext();
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("ACCEPTED");
      expect(verdict.distanceMeters).toBe(0);
      expect(verdict.anomalyFlags).toEqual([]);
      expect(verdict.anomaliesToReport).toEqual([]);
    });

    it("rejects when mock location flag is true", () => {
      const ctx = createValidContext({ mockFlag: true });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("MOCK_LOCATION");
      expect(verdict.errorCode).toBe("BAD_REQUEST");
    });

    it("rejects when student is not assigned to any division", () => {
      const ctx = createValidContext({ divisionId: null });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("NO_DIVISION");
    });

    it("rejects when bound device is missing fingerprint", () => {
      const ctx = createValidContext({ detectedFingerprint: undefined });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("DEVICE_REQUIRED");
      expect(verdict.errorCode).toBe("FORBIDDEN");
    });

    it("rejects and reports anomaly when device fingerprint mismatches", () => {
      const ctx = createValidContext({ detectedFingerprint: "rogue-phone-device-123" });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("DEVICE_MISMATCH");
      expect(verdict.errorCode).toBe("FORBIDDEN");
      expect(verdict.anomaliesToReport).toHaveLength(1);
      expect(verdict.anomaliesToReport[0]?.type).toBe("DEVICE_MISMATCH");
    });

    it("rejects live scan when attendance session is inactive", () => {
      const ctx = createValidContext();
      ctx.session.status = "closed";
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("SESSION_INACTIVE");
    });

    it("allows offline sync for closed session within 24 hour window", () => {
      const ctx = createValidContext({ isOfflineSync: true });
      ctx.session.status = "closed";
      ctx.session.createdAt = new Date(Date.now() - 3600000); // 1 hour ago
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("ACCEPTED");
      expect(verdict.anomalyFlags).toContain("offline_sync");
    });

    it("rejects offline sync if session was created over 24 hours ago", () => {
      const ctx = createValidContext({ isOfflineSync: true });
      ctx.session.status = "closed";
      ctx.session.createdAt = new Date(Date.now() - 25 * 3600000); // 25 hours ago
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("OFFLINE_WINDOW_EXPIRED");
    });

    it("rejects when student division is not enrolled in the session", () => {
      const ctx = createValidContext({ divisionId: "division-bca-b" });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("NOT_ENROLLED");
      expect(verdict.errorCode).toBe("FORBIDDEN");
    });

    it("rejects live scan when QR code token has expired", () => {
      const ctx = createValidContext();
      ctx.token.expiresAt = Date.now() - 5000; // expired 5 seconds ago
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("QR_EXPIRED");
    });

    it("rejects forged QR signature", () => {
      const ctx = createValidContext();
      ctx.token.signature = "forged-fake-hmac-signature-deadbeef";
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("INVALID_SIGNATURE");
    });

    it("rejects when student has already marked attendance", () => {
      const ctx = createValidContext({ attendanceAlreadyMarked: true });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("ALREADY_MARKED");
    });

    it("rejects when token is not found in cache or DB", () => {
      const ctx = createValidContext();
      ctx.token.tokenFoundInCacheOrDb = false;
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("INVALID_TOKEN");
    });

    it("rejects when GPS coordinates are missing", () => {
      const ctx = createValidContext({ gps: {} });
      const verdict = AttendanceValidator.evaluate(ctx);

      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("GPS_REQUIRED");
    });

    it("allows scan within indoor dynamic tolerance", () => {
      // Coordinate ~58m away from building center
      // Allowed radius: 50m. Device accuracy: 25m.
      // Effective radius = 50 + 25 = 75m. 58m <= 75m -> should pass!
      const ctx = createValidContext({
        gps: {
          lat: 22.60012,
          lng: 72.8205,
          accuracy: 25,
        },
      });

      const verdict = AttendanceValidator.evaluate(ctx);
      expect(verdict.outcome).toBe("ACCEPTED");
      expect(verdict.distanceMeters).toBeGreaterThan(50);
      expect(verdict.distanceMeters).toBeLessThanOrEqual(75);
    });

    it("rejects and reports anomaly when student is outside geofence", () => {
      // 22.6020 is ~266 meters away from 22.5996
      const ctx = createValidContext({
        gps: {
          lat: 22.602,
          lng: 72.8205,
          accuracy: 10,
        },
      });

      const verdict = AttendanceValidator.evaluate(ctx);
      expect(verdict.outcome).toBe("REJECTED");
      expect(verdict.rejectionReason).toBe("OUTSIDE_GEOFENCE");
      expect(verdict.anomaliesToReport).toHaveLength(1);
      expect(verdict.anomaliesToReport[0]?.type).toBe("GEOFENCE_VIOLATION");
    });
  });
});
