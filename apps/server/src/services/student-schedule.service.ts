import prisma from "@secured_attendance/db";
import { attendanceRedis } from "../lib/redis";
import { ScheduleResolver } from "../domain/schedule-resolver";

export class StudentScheduleService {
  static async getTodaySchedule(studentId: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
      },
    });

    if (!student?.studentProfile?.divisionId) {
      return [];
    }

    const divisionId = student.studentProfile.divisionId;

    await ScheduleResolver.autoCloseExpiredSessions();
    const { dayOfWeek, todayStart } = ScheduleResolver.getAcademicDate();

    const cacheKey = `tt:${divisionId}:${dayOfWeek}`;
    let timetableEntries: any[] | null = null;
    try {
      const cached = await attendanceRedis.get(cacheKey);
      if (cached) {
        timetableEntries = JSON.parse(cached);
      }
    } catch {}

    if (!timetableEntries) {
      timetableEntries = await prisma.timetableEntry.findMany({
        where: {
          dayOfWeek: dayOfWeek,
          divisions: {
            some: {
              divisionId: divisionId,
            },
          },
        },
        include: {
          subject: true,
          room: true,
        },
        orderBy: {
          startTime: "asc",
        },
      });

      void attendanceRedis.setex(cacheKey, 120, JSON.stringify(timetableEntries)).catch(() => {});
    }

    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        status: "active",
        sessionDivisions: {
          some: {
            divisionId: divisionId,
          },
        },
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const todaysSessions = await prisma.attendanceSession.findMany({
      where: {
        sessionDivisions: {
          some: {
            divisionId: divisionId,
          },
        },
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const todaysAttendances = await prisma.attendance.findMany({
      where: {
        studentProfileId: student.studentProfile.id,
        sessionId: {
          in: todaysSessions.map((s) => s.id),
        },
      },
    });

    return timetableEntries.map((entry) => {
      const activeSession = ScheduleResolver.matchSlotToSession(entry, activeSessions, "active");
      const matchedSession = ScheduleResolver.matchSlotToSession(entry, todaysSessions);

      const attendance = matchedSession
        ? todaysAttendances.find((a) => a.sessionId === matchedSession.id)
        : undefined;

      let attendanceStatus: "PRESENT" | "ABSENT" | undefined = undefined;
      if (attendance) {
        attendanceStatus = "PRESENT";
      } else if (matchedSession && matchedSession.status === "closed") {
        attendanceStatus = "ABSENT";
      }

      return {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subject: {
          id: entry.subject.id,
          name: entry.subject.name,
          code: entry.subject.code,
        },
        room: entry.room
          ? {
              id: entry.room.id,
              name: entry.room.name,
            }
          : { id: "unknown", name: "Unknown Room" },
        teacher: {
          id: "unknown",
          name: entry.teacherCodes.join(", ") || "Assigned Teacher",
        },
        activeSession: activeSession
          ? {
              id: activeSession.id,
              status: activeSession.status,
            }
          : undefined,
        attendanceStatus: attendanceStatus,
      };
    });
  }
}
