import prisma from "@secured_attendance/db";

export class StudentHistoryService {
  static async getHistory(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile) return { items: [], total: 0, page, limit };

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentProfileId: profile.id },
        include: {
          session: {
            include: {
              subject: true,
              room: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where: { studentProfileId: profile.id } }),
    ]);

    return {
      items: items.map((record) => ({
        id: record.id,
        date: record.timestamp.toISOString(),
        status: "PRESENT",
        session: {
          id: record.sessionId,
          subject: {
            name: record.session.subject.name,
            code: record.session.subject.code,
          },
          room: record.session.room
            ? {
                name: record.session.room.name,
              }
            : { name: "Unknown Room" },
        },
      })),
      total,
      page,
      limit,
    };
  }

  static async getStats(studentId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile || !profile.divisionId) {
      return { streak: 0, overallPercentage: 0, bySubject: [] };
    }

    const [attendedRecords, totalSessions] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentProfileId: profile.id },
        include: {
          session: {
            include: { subject: true },
          },
        },
        orderBy: { timestamp: "desc" },
      }),
      prisma.attendanceSession.findMany({
        where: {
          status: "closed",
          sessionDivisions: {
            some: { divisionId: profile.divisionId },
          },
        },
        include: { subject: true },
      }),
    ]);

    if (totalSessions.length === 0) {
      return { streak: 0, overallPercentage: 0, bySubject: [] };
    }

    const overallPercentage = Math.round(
      (attendedRecords.length / totalSessions.length) * 100,
    );

    const attendedSessionIds = new Set(attendedRecords.map((r) => r.sessionId));

    // Calculate streak: count consecutive most-recent sessions attended
    let streak = 0;
    const sortedSessions = [...totalSessions].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
    for (const s of sortedSessions) {
      if (attendedSessionIds.has(s.id)) {
        streak++;
      } else {
        break;
      }
    }

    // Per-subject stats
    const subjectTotalMap = new Map<string, { name: string; total: number }>();
    for (const s of totalSessions) {
      const existing = subjectTotalMap.get(s.subjectId);
      if (existing) {
        existing.total++;
      } else {
        subjectTotalMap.set(s.subjectId, { name: s.subject.name, total: 1 });
      }
    }

    const subjectAttendedMap = new Map<string, number>();
    for (const record of attendedRecords) {
      const count = subjectAttendedMap.get(record.session.subjectId) ?? 0;
      subjectAttendedMap.set(record.session.subjectId, count + 1);
    }

    const bySubject = Array.from(subjectTotalMap.entries()).map(([subjectId, info]) => {
      const attended = subjectAttendedMap.get(subjectId) ?? 0;
      return {
        subjectId,
        subjectName: info.name,
        percentage: Math.round((attended / info.total) * 100),
        attended,
        total: info.total,
      };
    });

    return {
      streak,
      overallPercentage,
      bySubject,
    };
  }
}
