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

    // Get today's day of week (0=Monday, 1=Tuesday, ... 5=Saturday for TimetableEntry)
    // JS getDay(): 0 = Sunday, 1 = Monday.
    const today = new Date();
    let dayOfWeek = today.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6; // Sunday mapped to 6 (even if not usually scheduled)

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
    const activeSessions = await prisma.attendanceSession.findMany({
      where: {
        status: "active",
        sessionDivisions: {
          some: {
            divisionId: divisionId
          }
        },
        // Must be today
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        }
      }
    });

    return timetableEntries.map(entry => {
      // Find active session for this subject
      const activeSession = activeSessions.find(s => s.subjectId === entry.subjectId);
      
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
      };
    });
  }
}
