import prisma from "@secured_attendance/db";
import { status } from "elysia";
import { logger } from "../../lib/logger";
import crypto from "crypto";

export class TeacherService {
  /**
   * Fetches the dashboard data for a teacher:
   * 1. Their schedule for today.
   * 2. Their currently active session (if any).
   */
  static async getDashboardData(userId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    // Convert JS day (0=Sun, 1=Mon) to DB day (0=Mon, 5=Sat)
    const jsDay = new Date().getDay();
    const dbDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    // Get today's schedule
    const schedule = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: dbDayOfWeek,
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

    // Get active session
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
      schedule,
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
      },
    });

    if (!entry) {
      return status(404, { message: "Timetable entry not found" });
    }

    if (!entry.teacherCodes.includes(profile.code)) {
      return status(403, { message: "You are not assigned to this class" });
    }

    // Create session
    const sessionSecret = crypto.randomBytes(32); // 256-bit secret

    const session = await prisma.attendanceSession.create({
      data: {
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

    return session;
  }

  /**
   * Closes an active attendance session.
   */
  static async closeSession(userId: string, sessionId: string) {
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
      return status(403, { message: "Not authorized to close this session" });
    }

    if (session.status === "closed") {
      return status(400, { message: "Session is already closed" });
    }

    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });

    logger.info("Session closed", { sessionId: closed.id, teacherCode: profile.code });

    return closed;
  }
}
