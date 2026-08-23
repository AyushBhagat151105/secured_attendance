import { Elysia, status } from "elysia";
import { requireRole } from "../auth/guards";
import { auth } from "@secured_attendance/auth";
import prisma from "@secured_attendance/db";

export const teacherReportModule = new Elysia({ prefix: "/reports" })
  .use(requireRole(["teacher"]))

  // 1. Get all past (closed) sessions for the authenticated teacher
  .get("/sessions", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        teacherProfile: { userId: session.user.id },
        status: "closed",
      },
      include: {
        subject: true,
        room: true,
        attendances: true,
        sessionDivisions: {
          include: {
            division: {
              include: {
                students: true,
              }
            }
          }
        }
      },
      orderBy: { startTime: "desc" },
    });

    return sessions.map(s => {
      const presentCount = s.attendances.length;
      let expectedCount = 0;
      s.sessionDivisions.forEach(sd => {
        expectedCount += sd.division.students.length;
      });

      return {
        id: s.id,
        subjectName: s.subject.name,
        roomName: s.room.name,
        startTime: s.startTime,
        closedAt: s.closedAt,
        presentCount,
        expectedCount,
      };
    });
  })

  // 2. Map data for a specific session
  .get("/sessions/:id/map", async ({ request, params }) => {
    const sessionCookie = await auth.api.getSession({ headers: request.headers });
    if (!sessionCookie) return status(401, { message: "Unauthorized" });

    const session = await prisma.attendanceSession.findUnique({
      where: { id: params.id },
      include: {
        room: { include: { building: true } },
        subject: true,
        attendances: {
          include: { studentProfile: { include: { user: true } } }
        }
      }
    });

    if (!session) return status(404, { message: "Session not found" });

    // Verify it belongs to the teacher
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: sessionCookie.user.id }
    });
    if (session.teacherProfileId !== teacherProfile?.id) {
      return status(403, { message: "Unauthorized" });
    }

    const points = session.attendances.map(a => ({
      studentId: a.studentProfileId,
      studentName: a.studentProfile.user.name,
      lat: a.gpsLat,
      lng: a.gpsLng,
      isWithinGeofence: a.gpsWithinGeofence,
      isMocked: a.mockLocationFlag,
    })).filter(p => p.lat !== null && p.lng !== null); // Filter out records without GPS

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
      points
    };
  })

  // 3. Get detailed attendance status for a specific session
  .get("/sessions/:id", async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: {
        id: params.id,
        teacherProfile: { userId: session.user.id },
      },
      include: {
        subject: true,
        attendances: {
          include: { studentProfile: true }
        },
        sessionDivisions: {
          include: {
            division: {
              include: { students: { include: { user: true } } }
            }
          }
        }
      }
    });

    if (!attendanceSession) return status(404, { message: "Session not found" });

    const expectedStudents = attendanceSession.sessionDivisions.flatMap(sd => sd.division.students);
    const presentStudentIds = new Set(attendanceSession.attendances.map(a => a.studentProfileId));

    const result = expectedStudents.map(student => ({
      studentId: student.id,
      name: student.user.name,
      email: student.user.email,
      rollNumber: student.enrollmentNo || student.id.substring(0, 8),
      status: presentStudentIds.has(student.id) ? "Present" : "Absent",
    }));

    return {
      sessionInfo: {
        subject: attendanceSession.subject.name,
        date: attendanceSession.startTime,
      },
      students: result
    };
  })

  // 3. Overall subject attendance percentage for the teacher
  .get("/subjects", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        teacherProfile: { userId: session.user.id },
        status: "closed",
      },
      include: {
        subject: true,
        attendances: true,
        sessionDivisions: {
          include: {
            division: {
              include: { students: true }
            }
          }
        }
      }
    });

    const subjectStats = new Map<string, { name: string, totalExpected: number, totalPresent: number }>();

    sessions.forEach(s => {
      const subjectId = s.subjectId;
      if (!subjectStats.has(subjectId)) {
        subjectStats.set(subjectId, { name: s.subject.name, totalExpected: 0, totalPresent: 0 });
      }

      const stat = subjectStats.get(subjectId)!;
      stat.totalPresent += s.attendances.length;
      
      let expectedInSession = 0;
      s.sessionDivisions.forEach(sd => {
        expectedInSession += sd.division.students.length;
      });
      stat.totalExpected += expectedInSession;
    });

    return Array.from(subjectStats.entries()).map(([id, stat]) => ({
      id,
      name: stat.name,
      percentage: stat.totalExpected > 0 ? Math.round((stat.totalPresent / stat.totalExpected) * 100) : 0,
    }));
  })

  // 4. CSV Export for a Subject
  .get("/export/:subjectId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return status(401, { message: "Unauthorized" });

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        subjectId: params.subjectId,
        teacherProfile: { userId: session.user.id },
        status: "closed",
      },
      include: {
        subject: true,
        attendances: { include: { studentProfile: { include: { user: true } } } }
      },
      orderBy: { startTime: "asc" }
    });

    if (sessions.length === 0) return status(404, { message: "No data found for this subject" });

    const divisionIds = new Set<string>();
    const sessionDivisions = await prisma.sessionDivision.findMany({
      where: { sessionId: { in: sessions.map(s => s.id) } }
    });
    sessionDivisions.forEach(sd => divisionIds.add(sd.divisionId));

    const expectedStudents = await prisma.studentProfile.findMany({
      where: { divisionId: { in: Array.from(divisionIds) } },
      include: { user: true }
    });

    const headers = ["Enrollment", "Name", ...sessions.map(s => new Date(s.startTime).toLocaleDateString())];
    const rows = expectedStudents.map(student => {
      const row = [student.enrollmentNo || student.id.substring(0, 8), student.user?.name || ""];
      sessions.forEach(s => {
        const wasPresent = s.attendances.some(a => a.studentProfileId === student.id);
        row.push(wasPresent ? "P" : "A");
      });
      return row;
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    set.headers["Content-Type"] = "text/csv";
    set.headers["Content-Disposition"] = `attachment; filename="attendance_${sessions[0]?.subject.name.replace(/ /g, "_")}.csv"`;
    return csvContent;
  });
