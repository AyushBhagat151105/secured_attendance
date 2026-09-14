import prisma from "@secured_attendance/db";

import { logger } from "../lib/logger";
import { attendanceRedis } from "../lib/redis";
import { queueAuditLog } from "../lib/audit";
import { checkImpossibleTravel, reportAnomaly } from "./anomaly.service";
import { AttendanceValidator, type ScanContext } from "../domain/attendance-validator";
import { defaultQrTokenManager } from "../domain/qr-token-manager";
import type { ScanAttendanceDto } from "../models/student.model";

export class StudentService {
  static async getProfile(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Student profile not found");
    }

    return profile;
  }

  static async submitAttendance(userId: string, body: ScanAttendanceDto, server?: any) {
    const {
      sessionId,
      nonce,
      signature,
      expiresAt,
      gpsLat,
      gpsLng,
      gpsAccuracy,
      mockFlag,
      deviceFingerprint,
      isOfflineSync,
      scannedAt,
    } = body;

    logger.info("Received QR attendance scan", { userId, sessionId, mockFlag, gpsLat, gpsLng });

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

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return { success: false, error: "NOT_FOUND", message: "Student profile not found" };
    }

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

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        studentProfileId_sessionId: {
          studentProfileId: profile.id,
          sessionId: session.id,
        },
      },
    });

    const tokenLookup = await defaultQrTokenManager.lookupNonce(sessionId, nonce, isOfflineSync);

    const context: ScanContext = {
      userId,
      studentProfileId: profile.id,
      divisionId: profile.divisionId,
      deviceBound: profile.deviceBound,
      boundDeviceId: profile.deviceId,
      detectedFingerprint: deviceFingerprint,
      mockFlag,
      session,
      token: {
        nonce,
        signature,
        expiresAt,
        tokenFoundInCacheOrDb: tokenLookup.found,
        tokenDbExpired: !!tokenLookup.isExpired,
      },
      attendanceAlreadyMarked: !!existingAttendance,
      gps: {
        lat: gpsLat,
        lng: gpsLng,
        accuracy: gpsAccuracy,
      },
      isOfflineSync,
      scannedAt,
    };

    const verdict = AttendanceValidator.evaluate(context);

    if (verdict.outcome === "REJECTED") {
      for (const anomaly of verdict.anomaliesToReport) {
        void reportAnomaly({
          userId,
          type: anomaly.type,
          severity: anomaly.severity,
          details: anomaly.details,
        });
      }

      if (verdict.auditRejectionDetails) {
        void queueAuditLog({
          eventType:
            verdict.rejectionReason === "OUTSIDE_GEOFENCE"
              ? "attendance.gps_outside_geofence"
              : "attendance.rejected",
          actor: userId,
          actorRole: "student",
          targetId: sessionId,
          details: verdict.auditRejectionDetails,
        });
      }

      return {
        success: false,
        error: verdict.errorCode || "BAD_REQUEST",
        message: verdict.clientMessage || "Attendance validation failed",
      };
    }

    if (gpsLat && gpsLng) {
      void checkImpossibleTravel(profile.id, userId, gpsLat, gpsLng, new Date());
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentProfileId: profile.id,
        sessionId: session.id,
        gpsLat,
        gpsLng,
        gpsWithinGeofence: true,
        anomalyFlags: verdict.anomalyFlags,
      },
    });

    logger.info("Attendance marked successfully", {
      userId,
      sessionId,
      attendanceId: attendance.id,
      isOfflineSync: !!isOfflineSync,
    });

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
