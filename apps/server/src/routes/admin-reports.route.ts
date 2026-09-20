import { Elysia, status } from "elysia";
import { requireRole } from "../middlewares/guards";
import prisma from "@secured_attendance/db";

export const adminReportModule = new Elysia({ prefix: "/reports" })
  .use(requireRole(["admin", "super_admin"]))

  // 1. Program-wide analytics
  .get("/analytics", async () => {
    // Basic program wide data for the dashboard
    const totalSessions = await prisma.attendanceSession.count();

    // We can count total attendances marked
    const totalAttendances = await prisma.attendance.count();

    // Count active sessions currently
    const activeSessions = await prisma.attendanceSession.count({
      where: { status: "active" },
    });

    // Find sessions with low attendance for a "below threshold alerts" list
    // Optimized with _count to avoid transferring thousands of nested student rows
    const recentSessions = await prisma.attendanceSession.findMany({
      where: { status: "closed" },
      select: {
        id: true,
        startTime: true,
        subject: { select: { name: true } },
        _count: { select: { attendances: true } },
        sessionDivisions: {
          select: {
            division: {
              select: {
                _count: { select: { students: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 20,
    });

    const alerts = [];
    let sumPercentage = 0;
    let countSessions = 0;

    for (const s of recentSessions) {
      const presentCount = s._count?.attendances ?? 0;
      let expectedCount = 0;
      s.sessionDivisions.forEach((sd) => {
        expectedCount += sd.division?._count?.students ?? 0;
      });

      if (expectedCount > 0) {
        const percentage = Math.round((presentCount / expectedCount) * 100);
        sumPercentage += percentage;
        countSessions++;

        if (percentage < 75) {
          alerts.push({
            sessionId: s.id,
            subjectName: s.subject.name,
            date: s.startTime,
            percentage,
            presentCount,
            expectedCount,
          });
        }
      }
    }

    const averageAttendance = countSessions > 0 ? Math.round(sumPercentage / countSessions) : 0;

    return {
      overview: {
        totalSessions,
        totalAttendances,
        activeSessions,
        averageAttendance,
      },
      alerts,
    };
  })

  // 2. Map data for a specific session
  .get("/sessions/:id/map", async ({ params }) => {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: params.id },
      include: {
        room: { include: { building: true } },
        subject: true,
        attendances: {
          include: { studentProfile: { include: { user: true } } },
        },
      },
    });

    if (!session) return status(404, { message: "Session not found" });

    const points = session.attendances
      .map((a) => ({
        studentId: a.studentProfileId,
        studentName: a.studentProfile.user.name,
        lat: a.gpsLat,
        lng: a.gpsLng,
        isWithinGeofence: a.gpsWithinGeofence,
        isMocked: a.mockLocationFlag,
      }))
      .filter((p) => p.lat !== null && p.lng !== null); // Filter out records without GPS

    return {
      sessionInfo: {
        subject: session.subject.name,
        date: session.startTime,
        room: session.room.name,
      },
      geofence: {
        centerLat: session.room.building.gpsLat,
        centerLng: session.room.building.gpsLng,
        radiusMeters: session.room.building.radiusMeters,
      },
      points,
    };
  })

  // 3. System-wide CSV export
  .get("/export", async ({ set }) => {
    // For simplicity, export all sessions in the current month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        startTime: { gte: thirtyDaysAgo },
        status: "closed",
      },
      include: {
        subject: true,
        teacherProfile: { include: { user: true } },
        attendances: true,
        sessionDivisions: {
          include: { division: { include: { students: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const headers = [
      "Session ID",
      "Date",
      "Subject",
      "Teacher",
      "Expected Students",
      "Present Students",
      "Attendance %",
    ];
    const rows = sessions.map((s) => {
      const presentCount = s.attendances.length;
      let expectedCount = 0;
      s.sessionDivisions.forEach((sd) => (expectedCount += sd.division.students.length));
      const percentage = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;

      return [
        s.id,
        new Date(s.startTime).toLocaleDateString(),
        `"${s.subject.name}"`, // Quote to handle commas in subject names
        `"${s.teacherProfile?.user?.name ?? "Unassigned"}"`,
        expectedCount.toString(),
        presentCount.toString(),
        `${percentage}%`,
      ];
    });

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");

    set.headers["Content-Type"] = "text/csv";
    set.headers["Content-Disposition"] = `attachment; filename="system_attendance_export.csv"`;
    return csvContent;
  });
