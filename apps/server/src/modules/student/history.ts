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
            }
          }
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where: { studentProfileId: profile.id } })
    ]);

    return {
      items: items.map(record => ({
        id: record.id,
        date: record.timestamp.toISOString(),
        status: "PRESENT",
        session: {
          id: record.sessionId,
          subject: {
            name: record.session.subject.name,
            code: record.session.subject.code,
          },
          room: record.session.room ? {
            name: record.session.room.name,
          } : { name: "Unknown Room" }
        }
      })),
      total,
      page,
      limit,
    };
  }

  static async getStats(studentId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile) return { streak: 0, overallPercentage: 0, bySubject: [] };

    const records = await prisma.attendance.findMany({
      where: { studentProfileId: profile.id },
      include: {
        session: {
          include: { subject: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (records.length === 0) {
      return { streak: 0, overallPercentage: 0, bySubject: [] };
    }

    // Calculate streak
    let streak = records.length; // Simplified since all records mean PRESENT

    const overallPercentage = records.length > 0 ? 100 : 0; // Simplified for now

    const subjectStatsMap = new Map<string, { name: string; total: number; attended: number }>();

    for (const record of records) {
      const subjectId = record.session.subjectId;
      if (!subjectStatsMap.has(subjectId)) {
        subjectStatsMap.set(subjectId, {
          name: record.session.subject.name,
          total: 0,
          attended: 0,
        });
      }
      
      const stats = subjectStatsMap.get(subjectId)!;
      stats.total++;
      stats.attended++;
    }

    const bySubject = Array.from(subjectStatsMap.entries()).map(([subjectId, stats]) => ({
      subjectId,
      subjectName: stats.name,
      percentage: (stats.attended / stats.total) * 100,
      attended: stats.attended,
      total: stats.total,
    }));

    return {
      streak,
      overallPercentage,
      bySubject,
    };
  }
}
