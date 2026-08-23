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

    // Get today's day of week
    // JS getDay(): 0 = Sunday, 1 = Monday.
    // The DB stores dayOfWeek using this exact mapping.
    const today = new Date();
    const dayOfWeek = today.getDay();

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: dayOfWeek,
        divisions: {
          some: {
            divisionId: divisionId
          }
        }
      },
      include: {
        subject: true,
        room: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // We also want to see if any of these subjects have an active session right now
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        status: "active",
        sessionDivisions: {
          some: {
            divisionId: divisionId
          }
        },
        createdAt: {
          gte: todayStart,
        }
      }
    });

    // Also fetch today's sessions regardless of status so we can check if they attended
    const todaysSessions = await prisma.attendanceSession.findMany({
      where: {
        sessionDivisions: {
          some: {
            divisionId: divisionId
          }
        },
        createdAt: {
          gte: todayStart,
        }
      }
    });
    
    // Check if the student has marked attendance in any of today's sessions
    const todaysAttendances = await prisma.attendance.findMany({
      where: {
        studentProfileId: student.studentProfile.id,
        sessionId: {
          in: todaysSessions.map(s => s.id)
        }
      }
    });

    return timetableEntries.map(entry => {
      // Find active session for this subject, room, and time slot
      const activeSession = activeSessions.find(s => {
        if (s.subjectId !== entry.subjectId) return false;
        if (entry.room && s.roomId !== entry.room.id) return false;
        
        // Check if session was created roughly around the timetable entry start time
        const [startHour = 0, startMin = 0] = entry.startTime.split(':').map(Number);
        const slotTimeMins = startHour * 60 + startMin;
        const sessionTimeMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
        return Math.abs(sessionTimeMins - slotTimeMins) <= 60;
      });
      
      // Find if there's an attendance record for this subject/time slot today
      const todaysSessionIdsForSubject = todaysSessions
        .filter(s => {
          if (s.subjectId !== entry.subjectId) return false;
          if (entry.room && s.roomId !== entry.room.id) return false;
          
          const [startHour = 0, startMin = 0] = entry.startTime.split(':').map(Number);
          const slotTimeMins = startHour * 60 + startMin;
          const sessionTimeMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
          return Math.abs(sessionTimeMins - slotTimeMins) <= 60;
        })
        .map(s => s.id);
        
      const attendance = todaysAttendances.find(a => todaysSessionIdsForSubject.includes(a.sessionId));
      
      let attendanceStatus = undefined;
      if (attendance) {
        attendanceStatus = "PRESENT"; // Right now we only store present scans. If they don't have one and the session is closed, they are absent.
      } else {
        // If they don't have an attendance record, check if there's a CLOSED session for this subject/time slot today.
        // If yes, they missed it.
        const hasClosedSession = todaysSessions.some(s => {
          if (s.subjectId !== entry.subjectId || s.status !== "closed") return false;
          if (entry.room && s.roomId !== entry.room.id) return false;
          
          const [startHour = 0, startMin = 0] = entry.startTime.split(':').map(Number);
          const slotTimeMins = startHour * 60 + startMin;
          const sessionTimeMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
          return Math.abs(sessionTimeMins - slotTimeMins) <= 60;
        });
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
        room: entry.room ? {
          id: entry.room.id,
          name: entry.room.name,
        } : { id: "unknown", name: "Unknown Room" },
        teacher: {
          id: "unknown",
          name: entry.teacherCodes.join(", ") || "Assigned Teacher",
        },
        activeSession: activeSession ? {
          id: activeSession.id,
          status: activeSession.status,
        } : undefined,
        attendanceStatus: attendanceStatus,
      };
    });
  }
}
