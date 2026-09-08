import prisma from "@secured_attendance/db";

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

    // Auto-close any active sessions whose endTime has passed
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

    // Use Indian Standard Time (Asia/Kolkata) to get today's day of week
    const istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const dayOfWeek = istDate.getDay();

    const timetableEntries = await prisma.timetableEntry.findMany({
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

    // We also want to see if any of these subjects have an active session right now
    const todayStart = new Date(istDate);
    todayStart.setHours(0, 0, 0, 0);

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

    // Also fetch today's sessions regardless of status so we can check if they attended
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

    // Check if the student has marked attendance in any of today's sessions
    const todaysAttendances = await prisma.attendance.findMany({
      where: {
        studentProfileId: student.studentProfile.id,
        sessionId: {
          in: todaysSessions.map((s) => s.id),
        },
      },
    });

    return timetableEntries.map((entry) => {
      // Find active session for this specific timetable slot
      const activeSession = activeSessions.find((s) => {
        if (s.timetableEntryId) {
          return s.timetableEntryId === entry.id;
        }
        if (s.subjectId !== entry.subjectId) return false;
        if (entry.room && s.roomId !== entry.room.id) return false;

        const [startHour = 0, startMin = 0] = entry.startTime.split(":").map(Number);
        const slotTimeMins = startHour * 60 + startMin;
        const sessionTimeMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
        return Math.abs(sessionTimeMins - slotTimeMins) <= 45;
      });

      // Find sessions for this specific slot
      const slotSessions = todaysSessions.filter((s) => {
        if (s.timetableEntryId) {
          return s.timetableEntryId === entry.id;
        }
        if (s.subjectId !== entry.subjectId) return false;
        if (entry.room && s.roomId !== entry.room.id) return false;

        const [startHour = 0, startMin = 0] = entry.startTime.split(":").map(Number);
        const slotTimeMins = startHour * 60 + startMin;
        const sessionTimeMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
        return Math.abs(sessionTimeMins - slotTimeMins) <= 45;
      });

      const slotSessionIds = slotSessions.map((s) => s.id);
      const attendance = todaysAttendances.find((a) =>
        slotSessionIds.includes(a.sessionId),
      );

      let attendanceStatus = undefined;
      if (attendance) {
        attendanceStatus = "PRESENT";
      } else {
        const hasClosedSession = slotSessions.some((s) => s.status === "closed");
        if (hasClosedSession) {
          attendanceStatus = "ABSENT";
        }
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
