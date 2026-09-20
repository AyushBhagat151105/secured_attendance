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
      isCloned,
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
      studentStatus: profile.status,
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
      isCloned,
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

    let attendance;
    try {
      attendance = await prisma.attendance.create({
        data: {
          studentProfileId: profile.id,
          sessionId: session.id,
          gpsLat,
          gpsLng,
          gpsWithinGeofence: true,
          mockLocationFlag: !!mockFlag,
          timestamp: isOfflineSync && scannedAt ? new Date(scannedAt) : new Date(),
          anomalyFlags: verdict.anomalyFlags,
        },
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError?.code === "P2002") {
        return {
          success: false,
          error: "BAD_REQUEST",
          message: "You have already marked attendance for this session",
        };
      }
      throw err;
    }

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

  static async requestDeviceRebind(
    userId: string,
    data: {
      requestedDeviceId: string;
      requestedDeviceModel: string;
      requestedDeviceOs?: string;
      reason: string;
    },
  ) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { success: false, error: "NOT_FOUND", message: "Student profile not found" };
    }

    if (!profile.deviceBound) {
      return {
        success: false,
        error: "NOT_BOUND",
        message: "No device currently bound to this account. You can bind directly.",
      };
    }

    const existingPending = await prisma.deviceRebindRequest.findFirst({
      where: {
        studentProfileId: profile.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return {
        success: false,
        error: "ALREADY_PENDING",
        message: "A device re-bind request is already pending administrator review.",
      };
    }

    const conflict = await prisma.studentProfile.findFirst({
      where: {
        deviceId: data.requestedDeviceId,
        deviceBound: true,
        id: { not: profile.id },
      },
    });

    if (conflict) {
      return {
        success: false,
        error: "DEVICE_ALREADY_IN_USE",
        message:
          "This device is already registered to another student. One device per student is strictly enforced.",
      };
    }

    const request = await prisma.deviceRebindRequest.create({
      data: {
        studentProfileId: profile.id,
        currentDeviceId: profile.deviceId,
        currentDeviceModel: profile.deviceModel,
        requestedDeviceId: data.requestedDeviceId,
        requestedDeviceModel: data.requestedDeviceModel,
        requestedDeviceOs: data.requestedDeviceOs ?? null,
        reason: data.reason.trim(),
        status: "PENDING",
      },
    });

    void queueAuditLog({
      eventType: "device.rebind_requested",
      actor: userId,
      actorRole: "student",
      targetId: profile.id,
      details: {
        requestId: request.id,
        requestedDeviceId: data.requestedDeviceId,
        requestedDeviceModel: data.requestedDeviceModel,
        reason: data.reason,
      },
    });

    return {
      success: true,
      request,
    };
  }

  static async getDeviceRebindStatus(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { success: false, error: "NOT_FOUND", message: "Student profile not found" };
    }

    const request = await prisma.deviceRebindRequest.findFirst({
      where: { studentProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      hasPending: request?.status === "PENDING",
      request: request ?? null,
    };
  }
}
