import prisma from "@secured_attendance/db";
import { status } from "elysia";
import { logger } from "../../lib/logger";
import crypto from "crypto";
import type { ScanAttendanceDto } from "./model";

// Calculate distance in meters between two GPS coordinates using Haversine formula
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = p2 - p1;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * d;
}

export class StudentService {
  /**
   * Processes a QR code scan by a student to mark attendance.
   * Performs cryptographic signature validation, enrollment validation, and geofence validation.
   */
  static async submitAttendance(userId: string, body: ScanAttendanceDto) {
    const { sessionId, nonce, signature, expiresAt, gpsLat, gpsLng } = body;

    // 1. Get student profile
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Student profile not found" });
    }

    if (!profile.divisionId) {
      return status(400, { message: "You are not assigned to any division" });
    }

    // 2. Fetch session and its details
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionDivisions: true,
        room: {
          include: { building: true }
        }
      }
    });

    if (!session) {
      return status(404, { message: "Session not found" });
    }

    if (session.status !== "active") {
      return status(400, { message: "This session is no longer active" });
    }

    // 3. Validation: Verify student's division is part of this session
    const isEnrolled = session.sessionDivisions.some(sd => sd.divisionId === profile.divisionId);
    if (!isEnrolled) {
      return status(403, { message: "You are not enrolled in this class" });
    }

    // 4. Validation: Check Expiry
    if (Date.now() > expiresAt) {
      return status(400, { message: "QR code has expired. Please scan the current code." });
    }

    // 5. Validation: Cryptographic Signature
    const payloadString = `${sessionId}:${nonce}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", session.sessionSecret)
      .update(payloadString)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("Invalid QR signature", { userId, sessionId, nonce });
      return status(400, { message: "Invalid QR code" });
    }

    // 6. Validation: Check if student already marked attendance
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        studentProfileId_sessionId: {
          studentProfileId: profile.id,
          sessionId: session.id,
        }
      }
    });

    if (existingAttendance) {
      return status(400, { message: "You have already marked attendance for this session" });
    }

    // 7. Validation: Replay Attack (Nonce consume)
    // We update the token to mark it as used by this student.
    // If the token was already used, this will fail.
    const token = await prisma.qrToken.findUnique({
      where: {
        sessionId_nonce: {
          sessionId,
          nonce
        }
      }
    });

    if (!token) {
      return status(400, { message: "Invalid token" });
    }

    if (token.usedAt) {
      return status(400, { message: "This QR code has already been used. Please scan the next one." });
    }

    // Atomically mark token as used
    try {
      await prisma.qrToken.update({
        where: {
          id: token.id,
          usedAt: null // Optimistic concurrency check
        },
        data: {
          usedAt: new Date(),
          usedBy: profile.id
        }
      });
    } catch (e) {
      return status(400, { message: "This QR code has already been used by someone else." });
    }

    // 8. Validation: Geofence
    let gpsWithinGeofence = false;
    let anomalyFlags: string[] = [];

    if (gpsLat && gpsLng && session.room.building.gpsLat && session.room.building.gpsLng) {
      const distance = getDistanceInMeters(
        gpsLat, 
        gpsLng, 
        session.room.building.gpsLat, 
        session.room.building.gpsLng
      );
      
      const allowedRadius = session.room.building.radiusMeters;
      
      if (distance <= allowedRadius) {
        gpsWithinGeofence = true;
      } else {
        anomalyFlags.push(`gps_outside_geofence_${Math.round(distance)}m`);
        // We log the exact distance for audit, but we just tell the client they are outside.
      }
    } else {
      anomalyFlags.push("gps_missing");
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
      }
    });

    logger.info("Attendance marked", { studentId: profile.id, sessionId: session.id, gpsWithinGeofence });

    return {
      success: true,
      gpsWithinGeofence,
      attendanceId: attendance.id
    };
  }
}
