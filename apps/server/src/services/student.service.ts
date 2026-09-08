import prisma from "@secured_attendance/db";

import { logger } from "../lib/logger";
import { attendanceRedis } from "../lib/redis";
import { queueAuditLog } from "../lib/audit";
import { checkImpossibleTravel, reportAnomaly } from "./anomaly.service";
import crypto from "crypto";
import type { ScanAttendanceDto } from "../models/student.model";

// Calculate distance in meters between two GPS coordinates using Haversine formula
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = p2 - p1;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * d;
}

export class StudentService {
  /**
   * Fetch the student profile for a given user ID
   */
  static async getProfile(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Student profile not found");
    }

    return profile;
  }

  /**
   * Processes a QR code scan by a student to mark attendance.
   * Performs cryptographic signature validation, enrollment validation, and geofence validation.
   */
  static async submitAttendance(userId: string, body: ScanAttendanceDto, server?: any) {
    const {
      sessionId,
      nonce,
      signature,
      expiresAt,
      gpsLat,
      gpsLng,
      mockFlag,
      deviceFingerprint,
      isOfflineSync,
      scannedAt,
    } = body;

    logger.info("Received QR attendance scan", { userId, sessionId, mockFlag, gpsLat, gpsLng });

    // 0. Rate Limiting Check
    const rateLimitKey = `ratelimit:${userId}`;
    const attempts = await attendanceRedis.incr(rateLimitKey);
    if (attempts === 1) {
      await attendanceRedis.expire(rateLimitKey, 60);
    }
    if (attempts > 5) {
      void queueAuditLog({
        eventType: "attendance.rate_limit_exceeded",
        actor: userId,
        actorRole: "student",
        targetId: sessionId,
        details: { attempts },
      });
      return {
        success: false,
        error: "TOO_MANY_REQUESTS",
        message: "Too many attempts, please try again later",
      };
    }

    // 0.5 Mock Location Check
    if (mockFlag) {
      logger.warn("Mock location detected", { userId, sessionId });
      void queueAuditLog({
        eventType: "attendance.rejected",
        actor: userId,
        actorRole: "student",
        targetId: sessionId,
        details: { reason: "mock_location" },
      });
      return { success: false, error: "BAD_REQUEST", message: "Location error" };
    }


    // 1. Get student profile
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { success: false, error: "NOT_FOUND", message: "Student profile not found" };
    }

    if (!profile.divisionId) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "You are not assigned to any division",
      };
    }

    // 1.5 Device Binding Enforcement
    if (profile.deviceBound && profile.deviceId) {
      if (!deviceFingerprint) {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "Device fingerprint is required",
        };
      }
      if (profile.deviceId !== deviceFingerprint) {
        void queueAuditLog({
          eventType: "attendance.rejected",
          actor: userId,
          actorRole: "student",
          targetId: sessionId,
          details: { reason: "device_mismatch" },
        });
        return {
          success: false,
          error: "FORBIDDEN",
          message: "This device is not authorized for your account",
        };
      }
    }

    // 2. Fetch session and its details
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionDivisions: true,
        room: {
          include: { building: true },
        },
      },
    });

    if (!session) {
      return { success: false, error: "NOT_FOUND", message: "Session not found" };
    }

    // For live scans, session must still be active.
    // For offline sync, allow active OR closed session within a 24-hour sync window.
    if (!isOfflineSync && session.status !== "active") {
      return { success: false, error: "BAD_REQUEST", message: "This session is no longer active" };
    }

    if (isOfflineSync) {
      const sessionAgeMs = Date.now() - session.createdAt.getTime();
      const MAX_OFFLINE_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
      if (sessionAgeMs > MAX_OFFLINE_SYNC_WINDOW_MS) {
        return {
          success: false,
          error: "BAD_REQUEST",
          message: "Offline attendance sync window (24 hours) has expired for this session.",
        };
      }
    }

    // 3. Validation: Verify student's division is part of this session
    const isEnrolled = session.sessionDivisions.some((sd) => sd.divisionId === profile.divisionId);
    if (!isEnrolled) {
      return { success: false, error: "FORBIDDEN", message: "You are not enrolled in this class" };
    }

    // 4. Validation: Check Expiry
    // For online live scans, enforce the 45-second QR rotation window
    if (!isOfflineSync && Date.now() > expiresAt) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "QR code has expired. Please scan the current code.",
      };
    }

    // 5. Validation: Cryptographic Signature
    const payloadString = `${sessionId}:${nonce}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", session.sessionSecret)
      .update(payloadString)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("Invalid QR signature", { userId, sessionId, nonce });
      return { success: false, error: "BAD_REQUEST", message: "Invalid QR code" };
    }

    // 6. Validation: Check if student already marked attendance
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        studentProfileId_sessionId: {
          studentProfileId: profile.id,
          sessionId: session.id,
        },
      },
    });

    if (existingAttendance) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "You have already marked attendance for this session",
      };
    }

    // 7. Validation: Nonce exists and belongs to this session
    const token = await prisma.qrToken.findUnique({
      where: {
        sessionId_nonce: {
          sessionId,
          nonce,
        },
      },
    });

    if (!token) {
      return { success: false, error: "BAD_REQUEST", message: "Invalid token" };
    }

    // For live scans, ensure token has not expired
    if (!isOfflineSync && new Date() > token.expiresAt) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "QR code has expired. Please scan the current code.",
      };
    }

    // 8. Validation: Geofence
    if (!gpsLat || !gpsLng) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "GPS location is required to mark attendance",
      };
    }

    if (!session.room.building.gpsLat || !session.room.building.gpsLng) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "Building geofence not configured. Contact your administrator.",
      };
    }

    const distance = getDistanceInMeters(
      gpsLat,
      gpsLng,
      session.room.building.gpsLat,
      session.room.building.gpsLng,
    );

    const allowedRadius = session.room.building.radiusMeters;
    const gpsWithinGeofence = distance <= allowedRadius;

    if (!gpsWithinGeofence) {
      void reportAnomaly({
        userId,
        type: "GEOFENCE_VIOLATION",
        severity: "MEDIUM",
        details: {
          reason: "gps_outside_geofence",
          distanceMeters: Math.round(distance),
          allowedRadius,
          studentGps: { lat: gpsLat, lng: gpsLng },
          buildingGps: { lat: session.room.building.gpsLat, lng: session.room.building.gpsLng },
          buildingName: session.room.building.name,
        },
      });
      void queueAuditLog({
        eventType: "attendance.gps_outside_geofence",
        actor: userId,
        actorRole: "student",
        targetId: sessionId,
        details: { distanceMeters: Math.round(distance), allowedRadius },
      });
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "Location error",
      };
    }

    // 8.5 Impossible Travel Check (async, non-blocking)
    if (gpsLat && gpsLng) {
      void checkImpossibleTravel(profile.id, userId, gpsLat, gpsLng, new Date());
    }

    // 9. Persist Attendance
    const anomalyFlags: string[] = [];
    if (isOfflineSync) {
      anomalyFlags.push("offline_sync");
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentProfileId: profile.id,
        sessionId: session.id,
        gpsLat,
        gpsLng,
        gpsWithinGeofence: true,
        anomalyFlags,
      },
    });

    logger.info("Attendance marked successfully", {
      userId,
      sessionId,
      attendanceId: attendance.id,
      isOfflineSync: !!isOfflineSync,
    });

    // 10. Async Audit Log + Live Feed Update
    void queueAuditLog({
      eventType: isOfflineSync ? "attendance.offline_synced" : "attendance.submitted",
      actor: userId,
      actorRole: "student",
      targetId: sessionId,
      details: {
        attendanceId: attendance.id,
        isOfflineSync: !!isOfflineSync,
        scannedAt,
      },
    });

    if (server) {
      try {
        const count = await prisma.attendance.count({
          where: { sessionId: session.id },
        });

        server.publish(
          `session-${session.id}`,
          JSON.stringify({
            type: "ATTENDANCE_COUNT",
            count,
          }),
        );
      } catch (e) {
        logger.error("Failed to publish attendance count to live feed", { error: e });
      }
    }

    return {
      success: true,
      attendanceId: attendance.id,
    };
  }
}
