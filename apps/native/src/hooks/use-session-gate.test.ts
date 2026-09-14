import { describe, expect, it } from "bun:test";
import {
  resolveSessionGateStatus,
  type ResolveGateParams,
} from "../lib/session-gate";

function createBaseParams(overrides?: Partial<ResolveGateParams>): ResolveGateParams {
  return {
    cacheLoaded: true,
    isPending: false,
    timeoutReached: false,
    effectiveSession: {
      user: {
        id: "student-user-1",
        name: "Ayush Bhagat",
        email: "26msit006@charusat.edu.in",
        role: "student",
        requiresPasswordChange: false,
      },
    },
    effectiveProfile: {
      id: "profile-1",
      deviceBound: true,
      deviceId: "device-pixel-8-id",
    },
    currentDeviceId: "device-pixel-8-id",
    ...overrides,
  };
}

describe("resolveSessionGateStatus — Pure Decision Engine", () => {
  describe("Boot & Network Pending States", () => {
    it("returns LOADING when offline cache has not finished reading from storage", () => {
      const status = resolveSessionGateStatus(createBaseParams({ cacheLoaded: false }));
      expect(status).toBe("LOADING");
    });

    it("returns LOADING when network session is pending and no cache exists", () => {
      const status = resolveSessionGateStatus(
        createBaseParams({
          isPending: true,
          timeoutReached: false,
          effectiveSession: null,
        }),
      );
      expect(status).toBe("LOADING");
    });

    it("falls back to offline cached session immediately without waiting for timeout", () => {
      const status = resolveSessionGateStatus(
        createBaseParams({
          isPending: true,
          timeoutReached: false,
        }),
      );
      expect(status).toBe("AUTHORIZED");
    });
  });

  describe("Unauthenticated States", () => {
    it("returns UNAUTHENTICATED when no session exists", () => {
      const status = resolveSessionGateStatus(
        createBaseParams({
          effectiveSession: null,
        }),
      );
      expect(status).toBe("UNAUTHENTICATED");
    });
  });

  describe("First-Time Onboarding: Password Reset Gate", () => {
    it("returns PASSWORD_CHANGE_REQUIRED when user requires password reset", () => {
      const params = createBaseParams();
      params.effectiveSession!.user.requiresPasswordChange = true;

      const status = resolveSessionGateStatus(params);
      expect(status).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("Student Role: Device Binding & Anti-Proxy Hardware Match", () => {
    it("returns DEVICE_BINDING_REQUIRED when student has not yet bound a phone", () => {
      const params = createBaseParams();
      params.effectiveProfile!.deviceBound = false;

      const status = resolveSessionGateStatus(params);
      expect(status).toBe("DEVICE_BINDING_REQUIRED");
    });

    it("returns DEVICE_MISMATCH when student logs in on a different physical device", () => {
      const params = createBaseParams({
        currentDeviceId: "different-unauthorized-phone",
      });

      const status = resolveSessionGateStatus(params);
      expect(status).toBe("DEVICE_MISMATCH");
    });

    it("returns AUTHORIZED when physical device fingerprint matches bound deviceId", () => {
      const params = createBaseParams({
        currentDeviceId: "device-pixel-8-id",
      });

      const status = resolveSessionGateStatus(params);
      expect(status).toBe("AUTHORIZED");
    });
  });

  describe("Non-Student Roles (Teacher / Admin)", () => {
    it("returns AUTHORIZED for teachers without requiring hardware device binding", () => {
      const params = createBaseParams({
        effectiveSession: {
          user: {
            id: "teacher-user-1",
            name: "Prof. Tushar Mehta",
            email: "tusharmehta.mca@charusat.ac.in",
            role: "teacher",
            requiresPasswordChange: false,
          },
        },
        effectiveProfile: null,
      });

      const status = resolveSessionGateStatus(params);
      expect(status).toBe("AUTHORIZED");
    });
  });
});
