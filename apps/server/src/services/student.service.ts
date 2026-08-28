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
    const { sessionId, nonce, signature, expiresAt, gpsLat, gpsLng, mockFlag } = body;

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

    if (session.status !== "active") {
      return { success: false, error: "BAD_REQUEST", message: "This session is no longer active" };
    }

    // 3. Validation: Verify student's division is part of this session
    const isEnrolled = session.sessionDivisions.some((sd) => sd.divisionId === profile.divisionId);
    if (!isEnrolled) {
      return { success: false, error: "FORBIDDEN", message: "You are not enrolled in this class" };
    }

    // 4. Validation: Check Expiry
    if (Date.now() > expiresAt) {
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

    // 7. Validation: Replay Attack (Nonce consume)
    // We update the token to mark it as used by this student.
    // If the token was already used, this will fail.
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

    if (token.usedAt) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "This QR code has already been used. Please scan the next one.",
      };
    }

    // Atomically mark token as used
    try {
      await prisma.qrToken.update({
        where: {
          id: token.id,
          usedAt: null, // Optimistic concurrency check
        },
        data: {
          usedAt: new Date(),
          usedBy: profile.id,
        },
      });
    } catch (e) {
      return {
        success: false,
        error: "BAD_REQUEST",
        message: "This QR code has already been used by someone else.",
      };
    }

    // 8. Validation: Geofence
    let gpsWithinGeofence = false;
    let anomalyFlags: string[] = [];

    if (gpsLat && gpsLng && session.room.building.gpsLat && session.room.building.gpsLng) {
      const distance = getDistanceInMeters(
        gpsLat,
        gpsLng,
        session.room.building.gpsLat,
        session.room.building.gpsLng,
      );

      const allowedRadius = session.room.building.radiusMeters;

      if (distance <= allowedRadius) {
        gpsWithinGeofence = true;
      } else {
        anomalyFlags.push(`gps_outside_geofence`);
        // Queue anomaly alert asynchronously — don't block the response
        void reportAnomaly({
          userId,
          type: "IMPOSSIBLE_TRAVEL",
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
      }
    } else {
      anomalyFlags.push("gps_missing");
    }

    // 8.5 Impossible Travel Check (async, non-blocking)
    if (gpsLat && gpsLng) {
      void checkImpossibleTravel(profile.id, userId, gpsLat, gpsLng, new Date());
    }

    // 9. Persist Attendance
    const attendance = await prisma.attendance.create({
      data: {
        studentProfileId: profile.id,
        sessionId: session.id,
        gpsLat,
        gpsLng,
        gpsWithinGeofence,
        anomalyFlags,
      },
    });

    logger.info("Attendance marked successfully", {
      userId,
      sessionId,
      attendanceId: attendance.id,
      gpsWithinGeofence,
    });

    // 10. Async Audit Log + Live Feed Update
    void queueAuditLog({
      eventType: "attendance.submitted",
      actor: userId,
      actorRole: "student",
      targetId: sessionId,
      details: {
        attendanceId: attendance.id,
        gpsWithinGeofence,
        anomalyFlags,
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
      gpsWithinGeofence,
      attendanceId: attendance.id,
    };
  }
}
