import prisma from "@secured_attendance/db";
import { status } from "elysia";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";
import { ScheduleResolver } from "../domain/schedule-resolver";
import crypto from "crypto";

export class TeacherService {
  static async getDashboardData(userId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    await ScheduleResolver.autoCloseExpiredSessions();
    const { dayOfWeek, todayStart } = ScheduleResolver.getAcademicDate();

    const schedule = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek,
        teacherCodes: {
          has: profile.code,
        },
      },
      include: {
        subject: true,
        room: true,
        divisions: {
          include: {
            division: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const todaysSessions = await prisma.attendanceSession.findMany({
      where: {
        teacherProfileId: profile.id,
        createdAt: { gte: todayStart },
      },
      select: {
        id: true,
        timetableEntryId: true,
        subjectId: true,
        roomId: true,
        status: true,
        createdAt: true,
      },
    });

    const scheduleWithCompletion = schedule.map((entry) => {
      const completedSession = ScheduleResolver.matchSlotToSession(entry, todaysSessions, "closed");
      return {
        ...entry,
        completedSessionId: completedSession?.id,
      };
    });

    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        teacherProfileId: profile.id,
        status: "active",
      },
      include: {
        subject: true,
        room: true,
        sessionDivisions: {
          include: {
            division: true,
          },
        },
      },
    });

    return {
      teacher: profile,
      schedule: scheduleWithCompletion,
      activeSession,
    };
  }

  /**
   * Starts a new attendance session for a given timetable entry.
   */
  static async startSession(userId: string, timetableEntryId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    // Ensure no other active session exists for this teacher
    const existing = await prisma.attendanceSession.findFirst({
      where: {
        teacherProfileId: profile.id,
        status: "active",
      },
    });

    if (existing) {
      return status(400, { message: "An active session already exists. Close it first." });
    }

    // Get timetable entry details
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: timetableEntryId },
      include: {
        divisions: true,
        room: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!entry) {
      return status(404, { message: "Timetable entry not found" });
    }

    if (!entry.teacherCodes.includes(profile.code)) {
      return status(403, { message: "You are not assigned to this class" });
    }

    // Validate Geofence Configuration
    if (
      entry.room?.building?.gpsLat == null ||
      entry.room?.building?.gpsLng == null ||
      !entry.room?.building?.radiusMeters
    ) {
      return status(400, {
        message:
          "GEOFENCE_NOT_CONFIGURED: The geofence for this classroom has not been set up. Please contact the administrator to set the building's GPS coordinates before taking attendance.",
      });
    }

    // Create session
    const sessionSecret = crypto.randomBytes(32); // 256-bit secret

    const session = await prisma.attendanceSession.create({
      data: {
        timetableEntryId: entry.id,
        academicYearId: entry.academicYearId,
        subjectId: entry.subjectId,
        roomId: entry.roomId,
        teacherProfileId: profile.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Default 2 hours max
        status: "active",
        sessionSecret,
        sessionDivisions: {
          create: entry.divisions.map((d) => ({
            divisionId: d.divisionId,
          })),
        },
      },
      include: {
        subject: true,
        room: true,
        sessionDivisions: {
          include: {
            division: true,
          },
        },
      },
    });

    logger.info("Session started", { sessionId: session.id, teacherCode: profile.code });

    void queueAuditLog({
      eventType: "session.opened",
      actor: userId,
      actorRole: "teacher",
      targetId: session.id,
      details: {
        subjectId: entry.subjectId,
        roomId: entry.roomId,
        teacherCode: profile.code,
      },
    });

    return session;
  }

  /**
   * Closes an active attendance session.
   */
  static async closeSession(userId: string, sessionId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true, code: true },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        teacherProfileId: true,
        status: true,
      },
    });

    if (!session) {
      return status(404, { message: "Session not found" });
    }

    if (session.teacherProfileId !== profile.id) {
      return status(403, { message: "Not authorized to close this session" });
    }

    if (session.status === "closed") {
      return status(400, { message: "Session is already closed" });
    }

    const attendanceCount = await prisma.attendance.count({
      where: { sessionId },
    });

    if (attendanceCount === 0) {
      const closedEmpty = await prisma.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          closedAt: true,
          subjectId: true,
          roomId: true,
        },
      });
      logger.info("Empty session closed", { sessionId, teacherCode: profile.code });
      return {
        success: true,
        deleted: false,
        empty: true,
        session: closedEmpty,
        message: "Session closed with 0 attendance records",
      };
    }

    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        closedAt: true,
        subjectId: true,
        roomId: true,
      },
    });

    logger.info("Session closed", { sessionId: closed.id, teacherCode: profile.code });

    void queueAuditLog({
      eventType: "session.closed",
      actor: userId,
      actorRole: "teacher",
      targetId: sessionId,
      details: { attendanceCount, teacherCode: profile.code },
    });

    return { success: true, deleted: false, session: closed };
  }

  /**
   * Deletes a session explicitly (e.g. if the teacher made a mistake or was just testing).
   */
  static async deleteSession(userId: string, sessionId: string) {
    if (process.env.NODE_ENV !== "development") {
      return status(403, { message: "Session deletion is only allowed in development mode." });
    }

    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return status(404, { message: "Session not found" });
    }

    if (session.teacherProfileId !== profile.id) {
      return status(403, { message: "Not authorized to delete this session" });
    }

    await prisma.attendanceSession.delete({
      where: { id: sessionId },
    });

    logger.info("Session deleted manually", { sessionId, teacherCode: profile.code });

    return { success: true };
  }
}
