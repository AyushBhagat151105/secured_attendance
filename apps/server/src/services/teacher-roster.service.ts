import prisma from "@secured_attendance/db";
import { status } from "elysia";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";
import crypto from "crypto";

export class TeacherRosterService {
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

    const attendanceMap = new Map<string, (typeof session.attendances)[0]>();
    for (const a of session.attendances) {
      attendanceMap.set(a.studentProfileId, a);
    }

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

    const toAdd = presentStudentIds.filter((id) => !existingStudentIds.has(id));
    const toRemove = session.attendances
      .filter((a) => !targetStudentIds.has(a.studentProfileId))
      .map((a) => a.id);

    const closed = await prisma.$transaction(async (tx) => {
      if (toAdd.length > 0) {
        await tx.attendance.createMany({
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
        await tx.attendance.deleteMany({
          where: { id: { in: toRemove } },
        });
      }

      return tx.attendanceSession.update({
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
