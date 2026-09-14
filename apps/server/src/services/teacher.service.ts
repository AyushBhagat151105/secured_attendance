import prisma from "@secured_attendance/db";
import { status } from "elysia";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";
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

    // Auto-close any active sessions whose endTime has passed (Phase 4 session auto-close)
    await prisma.attendanceSession.updateMany({
      where: {
        status: "active",
        endTime: { lt: new Date() },
      },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });

    // Use Indian Standard Time (Asia/Kolkata) to get day of week and start of day
    const istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const jsDay = istDate.getDay();

    // Get today's schedule
    const schedule = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: jsDay,
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

    const todayStart = new Date(istDate);
    todayStart.setHours(0, 0, 0, 0);

    // Fetch today's sessions to see which schedule slots are already completed
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

    // Attach completedSessionId to schedule entries
    const scheduleWithCompletion = schedule.map((entry) => {
      // 1. Direct match by timetableEntryId
      let completedSession = todaysSessions.find(
        (s) => s.timetableEntryId === entry.id && s.status === "closed",
      );

      // 2. Fallback for legacy sessions created before timetableEntryId was introduced:
      // Match by subject, room, and time proximity to avoid matching all slots of the same subject!
      if (!completedSession) {
        const [sh = 0, sm = 0] = entry.startTime.split(":").map(Number);
        const slotMins = sh * 60 + sm;

        completedSession = todaysSessions.find((s) => {
          if (s.subjectId !== entry.subjectId || s.roomId !== entry.roomId || s.status !== "closed")
            return false;
          // If the session was explicitly assigned to another timetable entry, don't hijack it
          if (s.timetableEntryId && s.timetableEntryId !== entry.id) return false;

          const sessionMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
          return Math.abs(sessionMins - slotMins) <= 45;
        });
      }

      return {
        ...entry,
        completedSessionId: completedSession?.id,
      };
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
    if (!entry.room?.building?.gpsLat || !entry.room?.building?.radiusMeters) {
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

  /**
   * Fetches the enrolled student roster for a specific timetable slot (Mode 1).
   */
  static async getTimetableRoster(userId: string, timetableEntryId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    const entry = await prisma.timetableEntry.findUnique({
      where: { id: timetableEntryId },
      include: {
        subject: true,
        room: true,
        divisions: {
          include: {
            division: {
              include: {
                students: {
                  include: {
                    user: true,
                  },
                },
              },
            },
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

    // Flatten students from all divisions assigned to this slot
    const studentsMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        rollNumber: string;
        enrollmentNo: string;
        divisionName: string;
      }
    >();

    for (const d of entry.divisions) {
      for (const student of d.division.students) {
        if (!studentsMap.has(student.id)) {
          studentsMap.set(student.id, {
            id: student.id,
            name: student.user.name,
            email: student.user.email,
            rollNumber: student.rollNumber || "",
            enrollmentNo: student.enrollmentNo || "",
            divisionName: d.division.name,
          });
        }
      }
    }

    const students = Array.from(studentsMap.values()).sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    return {
      timetableEntry: {
        id: entry.id,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type,
        subject: {
          id: entry.subject.id,
          name: entry.subject.name,
          code: entry.subject.code,
        },
        room: {
          id: entry.room.id,
          name: entry.room.name,
        },
        divisions: entry.divisions.map((d) => d.division.name),
      },
      students,
    };
  }

  /**
   * Submits manual attendance for a timetable entry directly (Mode 1).
   */
  static async submitManualAttendance(
    userId: string,
    data: { timetableEntryId: string; presentStudentIds: string[]; notes?: string },
  ) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    const entry = await prisma.timetableEntry.findUnique({
      where: { id: data.timetableEntryId },
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

    const now = new Date();
    const sessionSecret = crypto.randomBytes(32);

    // Create a closed session representing this manual roll call
    const session = await prisma.attendanceSession.create({
      data: {
        timetableEntryId: entry.id,
        academicYearId: entry.academicYearId,
        subjectId: entry.subjectId,
        roomId: entry.roomId,
        teacherProfileId: profile.id,
        startTime: now,
        endTime: now,
        status: "closed",
        closedAt: now,
        sessionSecret,
        sessionDivisions: {
          create: entry.divisions.map((d) => ({
            divisionId: d.divisionId,
          })),
        },
      },
    });

    // Create attendance records for all present students
    if (data.presentStudentIds.length > 0) {
      await prisma.attendance.createMany({
        data: data.presentStudentIds.map((studentProfileId) => ({
          sessionId: session.id,
          studentProfileId,
          gpsWithinGeofence: true,
          anomalyFlags: ["manual_attendance"],
        })),
        skipDuplicates: true,
      });
    }

    logger.info("Manual attendance recorded", {
      sessionId: session.id,
      teacherCode: profile.code,
      presentCount: data.presentStudentIds.length,
    });

    void queueAuditLog({
      eventType: "attendance.manual_marked",
      actor: userId,
      actorRole: "teacher",
      targetId: session.id,
      details: {
        timetableEntryId: entry.id,
        subjectId: entry.subjectId,
        presentCount: data.presentStudentIds.length,
        notes: data.notes,
      },
    });

    return {
      success: true,
      sessionId: session.id,
      presentCount: data.presentStudentIds.length,
    };
  }

  /**
   * Fetches the complete student roster and current scan status for an active session (Mode 2).
   */
  static async getSessionRoster(userId: string, sessionId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: true,
        room: true,
        attendances: true,
        sessionDivisions: {
          include: {
            division: {
              include: {
                students: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return status(404, { message: "Session not found" });
    }

    if (session.teacherProfileId !== profile.id) {
      return status(403, { message: "Not authorized to access this session" });
    }

    // Build map of attended records
    const attendanceMap = new Map<string, (typeof session.attendances)[0]>();
    for (const a of session.attendances) {
      attendanceMap.set(a.studentProfileId, a);
    }

    // Flatten students
    const studentsMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        rollNumber: string;
        enrollmentNo: string;
        divisionName: string;
        status: "present_qr" | "present_manual" | "absent";
        scannedAt?: string;
      }
    >();

    for (const sd of session.sessionDivisions) {
      for (const student of sd.division.students) {
        if (!studentsMap.has(student.id)) {
          const record = attendanceMap.get(student.id);
          let studentStatus: "present_qr" | "present_manual" | "absent" = "absent";

          if (record) {
            if (
              record.anomalyFlags.includes("manual_attendance") ||
              record.anomalyFlags.includes("manual_teacher_override")
            ) {
              studentStatus = "present_manual";
            } else {
              studentStatus = "present_qr";
            }
          }

          studentsMap.set(student.id, {
            id: student.id,
            name: student.user.name,
            email: student.user.email,
            rollNumber: student.rollNumber || "",
            enrollmentNo: student.enrollmentNo || "",
            divisionName: sd.division.name,
            status: studentStatus,
            scannedAt: record?.timestamp ? record.timestamp.toISOString() : undefined,
          });
        }
      }
    }

    const students = Array.from(studentsMap.values()).sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    const qrCount = students.filter((s) => s.status === "present_qr").length;
    const manualCount = students.filter((s) => s.status === "present_manual").length;
    const absentCount = students.filter((s) => s.status === "absent").length;

    return {
      session: {
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        subject: {
          name: session.subject.name,
          code: session.subject.code,
        },
        room: {
          name: session.room.name,
        },
      },
      stats: {
        total: students.length,
        presentQr: qrCount,
        presentManual: manualCount,
        absent: absentCount,
      },
      students,
    };
  }

  /**
   * Finalizes session attendance with manual teacher overrides and marks session closed (Mode 2).
   */
  static async finalizeSessionAttendance(
    userId: string,
    sessionId: string,
    presentStudentIds: string[],
  ) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return status(404, { message: "Teacher profile not found" });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        attendances: true,
      },
    });

    if (!session) {
      return status(404, { message: "Session not found" });
    }

    if (session.teacherProfileId !== profile.id) {
      return status(403, { message: "Not authorized to finalize this session" });
    }

    const existingStudentIds = new Set(session.attendances.map((a) => a.studentProfileId));
    const targetStudentIds = new Set(presentStudentIds);

    // 1. Identify newly added students
    const toAdd = presentStudentIds.filter((id) => !existingStudentIds.has(id));

    // 2. Identify students removed by teacher
    const toRemove = session.attendances
      .filter((a) => !targetStudentIds.has(a.studentProfileId))
      .map((a) => a.id);

    if (toAdd.length > 0) {
      await prisma.attendance.createMany({
        data: toAdd.map((studentProfileId) => ({
          sessionId: session.id,
          studentProfileId,
          gpsWithinGeofence: true,
          anomalyFlags: ["manual_teacher_override"],
        })),
        skipDuplicates: true,
      });
    }

    if (toRemove.length > 0) {
      await prisma.attendance.deleteMany({
        where: { id: { in: toRemove } },
      });
    }

    // 3. Mark session as closed
    const now = new Date();
    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: "closed",
        closedAt: now,
      },
      select: {
        id: true,
        status: true,
        closedAt: true,
        subjectId: true,
        roomId: true,
      },
    });

    logger.info("Session finalized with overrides", {
      sessionId,
      addedOverrides: toAdd.length,
      removedOverrides: toRemove.length,
      totalFinal: presentStudentIds.length,
    });

    void queueAuditLog({
      eventType: "session.finalized_with_overrides",
      actor: userId,
      actorRole: "teacher",
      targetId: sessionId,
      details: {
        addedOverrides: toAdd.length,
        removedOverrides: toRemove.length,
        totalPresent: presentStudentIds.length,
      },
    });

    return {
      success: true,
      session: closed,
      addedOverrides: toAdd.length,
      totalPresent: presentStudentIds.length,
    };
  }
}
