import prisma from "@secured_attendance/db";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";
import type {
  UpdateUserType,
  UsersListQueryType,
  CreateTeacherType,
  CreateStudentType,
  CreateAdminType,
} from "../models/admin-users.model";
import { status } from "elysia";
import { auth } from "@secured_attendance/auth";
import { env } from "@secured_attendance/env/server";

export class AdminUsersService {
  static async listUsers(query: UsersListQueryType) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) {
      where.role = query.role;
    }

    const studentProfileConditions: any = {};
    if (query.status) {
      studentProfileConditions.status = query.status;
    }
    if (query.programCode) {
      studentProfileConditions.programCode = { equals: query.programCode, mode: "insensitive" };
    }
    if (query.divisionId) {
      studentProfileConditions.divisionId = query.divisionId;
    }
    if (query.semester !== undefined || query.academicYearId || query.programId) {
      studentProfileConditions.division = {
        programSemester: {
          ...(query.semester !== undefined ? { semester: query.semester } : {}),
          ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
          ...(query.programId ? { programId: query.programId } : {}),
        },
      };
    }

    if (Object.keys(studentProfileConditions).length > 0) {
      where.studentProfile = studentProfileConditions;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" as const } },
        { email: { contains: s, mode: "insensitive" as const } },
        { studentProfile: { enrollmentNo: { contains: s, mode: "insensitive" as const } } },
        { studentProfile: { rollNumber: { contains: s, mode: "insensitive" as const } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
          studentProfile: {
            select: {
              id: true,
              enrollmentNo: true,
              status: true,
              deviceBound: true,
              deviceModel: true,
              deviceOs: true,
              programCode: true,
              rollNumber: true,
              admissionYear: true,
              divisionId: true,
              division: {
                select: {
                  id: true,
                  name: true,
                  programSemester: {
                    select: {
                      id: true,
                      semester: true,
                      program: {
                        select: {
                          id: true,
                          name: true,
                          code: true,
                          shortName: true,
                        },
                      },
                      academicYear: {
                        select: {
                          id: true,
                          name: true,
                          isCurrent: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          teacherProfile: {
            select: {
              code: true,
              department: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
        studentProfile: {
          select: {
            enrollmentNo: true,
            status: true,
            deviceBound: true,
            deviceModel: true,
            deviceOs: true,
            deviceBoundAt: true,
            biometricEnabled: true,
            programCode: true,
            admissionYear: true,
            rollNumber: true,
          },
        },
        teacherProfile: {
          select: {
            code: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      return status(404, { message: "User not found" });
    }

    return user;
  }

  static async createTeacher(data: CreateTeacherType) {
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) {
      return status(400, { message: "User with this email already exists" });
    }

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: env.DEFAULT_TEACHER_PASSWORD,
          name: data.name,
        },
        asResponse: false,
      });

      if (!result?.user) {
        return status(500, { message: "Failed to create user account" });
      }

      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          role: "teacher",
          requiresPasswordChange: true,
        },
      });

      await prisma.teacherProfile.create({
        data: {
          userId: result.user.id,
          code: data.teacherCode,
          department: data.department,
        },
      });

      return result.user;
    } catch (error) {
      logger.error("Failed to create teacher", { error, data });
      return status(500, { message: "Internal Server Error" });
    }
  }

  static async createStudent(data: CreateStudentType) {
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) {
      return status(400, { message: "User with this email already exists" });
    }

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: env.DEFAULT_STUDENT_PASSWORD,
          name: data.name,
        },
        asResponse: false,
      });

      if (!result?.user) {
        return status(500, { message: "Failed to create user account" });
      }

      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          role: "student",
          requiresPasswordChange: true,
        },
      });

      const match = data.enrollmentNo.match(/^(\d{2})([a-z]+)(\d{3,4})$/i);
      const parsedYear = match && match[1] ? 2000 + parseInt(match[1]) : new Date().getFullYear();
      const parsedRoll = match && match[3] ? match[3] : "";

      await prisma.studentProfile.create({
        data: {
          userId: result.user.id,
          enrollmentNo: data.enrollmentNo,
          programCode: data.programCode,
          admissionYear: parsedYear,
          rollNumber: parsedRoll,
          divisionId: data.divisionId,
        },
      });

      return result.user;
    } catch (error) {
      logger.error("Failed to create student", { error, data });
      return status(500, { message: "Internal Server Error" });
    }
  }

  static async createAdmin(data: CreateAdminType) {
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) {
      return status(400, { message: "User with this email already exists" });
    }

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: env.DEFAULT_TEACHER_PASSWORD,
          name: data.name,
        },
        asResponse: false,
      });

      if (!result?.user) {
        return status(500, { message: "Failed to create user account" });
      }

      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          role: "admin",
          requiresPasswordChange: true,
        },
      });

      return result.user;
    } catch (error) {
      logger.error("Failed to create admin", { error, data });
      return status(500, { message: "Internal Server Error" });
    }
  }

  static async updateUser(id: string, body: UpdateUserType) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return status(404, { message: "User not found" });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.role) updateData.role = body.role;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (body.status && existing.role === "student") {
      await prisma.studentProfile.updateMany({
        where: { userId: id },
        data: { status: body.status },
      });
    }

    logger.info("User updated", { userId: id, changes: body });
    return user;
  }

  static async suspendUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return status(404, { message: "User not found" });
    }

    await prisma.user.update({
      where: { id },
      data: { banned: true, banReason: "Suspended by administrator" },
    });

    if (existing.role === "student") {
      await prisma.studentProfile.updateMany({
        where: { userId: id },
        data: { status: "suspended" },
      });
    }

    logger.info("User suspended", { userId: id });
    return { success: true };
  }

  static async deleteUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return status(404, { message: "User not found" });
    }

    await prisma.user.delete({ where: { id } });

    logger.info("User deleted", { userId: id });
    return { success: true };
  }

  static async rebindDevice(id: string, server?: any) {
    const profile = await prisma.studentProfile.findFirst({
      where: { userId: id },
    });

    if (!profile) {
      return status(404, { message: "Student profile not found" });
    }

    await prisma.studentProfile.update({
      where: { userId: id },
      data: {
        deviceId: null,
        deviceModel: null,
        deviceOs: null,
        deviceBound: false,
        deviceBoundAt: null,
        biometricEnabled: false,
      },
    });

    if (server) {
      try {
        server.publish(
          `student-${id}`,
          JSON.stringify({
            type: "DEVICE_UNBOUND",
            reason: "admin_user_reset",
            studentProfileId: profile.id,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        logger.error("Failed to publish DEVICE_UNBOUND from user rebind", { error: e });
      }
    }

    logger.info("Device rebound by admin", { userId: id });
    void queueAuditLog({
      eventType: "device.rebound",
      actorRole: "admin",
      targetId: id,
      details: { studentProfileId: profile.id },
    });
    return { success: true };
  }

  static async getStudentDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        banned: true,
        requiresPasswordChange: true,
        studentProfile: {
          select: {
            id: true,
            enrollmentNo: true,
            status: true,
            deviceBound: true,
            deviceId: true,
            deviceModel: true,
            deviceOs: true,
            deviceBoundAt: true,
            biometricEnabled: true,
            programCode: true,
            admissionYear: true,
            rollNumber: true,
            divisionId: true,
            division: {
              select: {
                id: true,
                name: true,
                programSemester: {
                  select: {
                    id: true,
                    semester: true,
                    program: {
                      select: { id: true, name: true, code: true, shortName: true },
                    },
                    academicYear: {
                      select: { id: true, name: true, isCurrent: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.studentProfile) {
      return status(404, { message: "Student profile not found" });
    }

    const profile = user.studentProfile;

    const [attendedRecords, totalSessions] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentProfileId: profile.id },
        include: {
          session: {
            include: {
              subject: true,
              room: { include: { building: true } },
              teacherProfile: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { timestamp: "desc" },
      }),
      profile.divisionId
        ? prisma.attendanceSession.findMany({
            where: {
              status: "closed",
              sessionDivisions: {
                some: { divisionId: profile.divisionId },
              },
            },
            include: { subject: true },
          })
        : Promise.resolve([]),
    ]);

    const totalConducted = totalSessions.length;
    const totalAttended = attendedRecords.length;
    const overallPercentage =
      totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 1000) / 10 : 0;

    const subjectStatsMap = new Map<
      string,
      { subjectId: string; subjectName: string; subjectCode: string; conducted: number; attended: number }
    >();

    for (const session of totalSessions) {
      const sub = session.subject;
      if (!subjectStatsMap.has(sub.id)) {
        subjectStatsMap.set(sub.id, {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          conducted: 0,
          attended: 0,
        });
      }
      subjectStatsMap.get(sub.id)!.conducted++;
    }

    for (const record of attendedRecords) {
      const sub = record.session?.subject;
      if (sub) {
        if (!subjectStatsMap.has(sub.id)) {
          subjectStatsMap.set(sub.id, {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            conducted: 1,
            attended: 0,
          });
        }
        subjectStatsMap.get(sub.id)!.attended++;
      }
    }

    const bySubject = Array.from(subjectStatsMap.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      conducted: s.conducted,
      attended: s.attended,
      percentage: s.conducted > 0 ? Math.round((s.attended / s.conducted) * 1000) / 10 : 0,
    }));

    let streak = 0;
    const sortedConducted = [...totalSessions].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
    const attendedSessionIds = new Set(attendedRecords.map((r) => r.sessionId));
    for (const s of sortedConducted) {
      if (attendedSessionIds.has(s.id)) {
        streak++;
      } else {
        break;
      }
    }

    const recentAttendances = attendedRecords.slice(0, 25).map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      timestamp: r.timestamp.toISOString(),
      subjectName: r.session?.subject?.name || "Subject",
      subjectCode: r.session?.subject?.code || "",
      teacherName: r.session?.teacherProfile?.user?.name || "Teacher",
      roomName: r.session?.room?.name || "Room",
      buildingName: r.session?.room?.building?.name || "Campus",
      gpsWithinGeofence: r.gpsWithinGeofence,
      mockLocationFlag: r.mockLocationFlag,
      anomalyFlags: r.anomalyFlags,
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
        banned: user.banned,
        requiresPasswordChange: user.requiresPasswordChange,
      },
      profile,
      stats: {
        totalConducted,
        totalAttended,
        overallPercentage,
        streak,
        bySubject,
      },
      recentAttendances,
    };
  }

  static async changePassword(
    id: string,
    body: { newPassword: string; requiresPasswordChange?: boolean },
    adminUser?: any,
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return status(404, { message: "User not found" });
    }

    try {
      await auth.api.setUserPassword({
        body: {
          userId: id,
          newPassword: body.newPassword,
        },
      });

      const requiresPasswordChange = body.requiresPasswordChange ?? true;
      await prisma.user.update({
        where: { id },
        data: { requiresPasswordChange },
      });

      void queueAuditLog({
        eventType: "user.password_changed_by_admin",
        actor: adminUser?.id || "admin",
        actorRole: "admin",
        targetId: id,
        details: { targetEmail: existing.email, requiresPasswordChange },
      });

      logger.info("Admin updated user password", { userId: id, targetEmail: existing.email });
      return { success: true, message: "Password updated successfully" };
    } catch (err: any) {
      logger.error("Failed to change user password", { error: err, userId: id });
      return status(500, { message: err?.message || "Failed to update user password" });
    }
  }

  static async bulkDelete(userIds: string[], adminUser?: any) {
    if (!userIds.length) {
      return status(400, { message: "No users selected" });
    }

    const count = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    void queueAuditLog({
      eventType: "user.bulk_deleted",
      actor: adminUser?.id || "admin",
      actorRole: "admin",
      targetId: "bulk",
      details: { userIds, deletedCount: count.count },
    });

    logger.info("Admin bulk deleted users", { count: count.count });
    return { success: true, count: count.count };
  }

  static async bulkStatus(
    userIds: string[],
    statusValue: "active" | "suspended" | "pending",
    adminUser?: any,
  ) {
    if (!userIds.length) {
      return status(400, { message: "No users selected" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.updateMany({
        where: { userId: { in: userIds } },
        data: { status: statusValue },
      });

      await tx.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          banned: statusValue === "suspended",
          banReason: statusValue === "suspended" ? "Suspended by administrator" : null,
        },
      });
    });

    void queueAuditLog({
      eventType: "user.bulk_status_updated",
      actor: adminUser?.id || "admin",
      actorRole: "admin",
      targetId: "bulk",
      details: { userIds, newStatus: statusValue },
    });

    logger.info("Admin bulk updated user status", { count: userIds.length, status: statusValue });
    return { success: true, count: userIds.length };
  }

  static async bulkDivision(userIds: string[], divisionId: string, adminUser?: any) {
    if (!userIds.length) {
      return status(400, { message: "No users selected" });
    }

    const division = await prisma.division.findUnique({ where: { id: divisionId } });
    if (!division) {
      return status(404, { message: "Target division not found" });
    }

    const result = await prisma.studentProfile.updateMany({
      where: { userId: { in: userIds } },
      data: { divisionId },
    });

    void queueAuditLog({
      eventType: "student.bulk_division_updated",
      actor: adminUser?.id || "admin",
      actorRole: "admin",
      targetId: "bulk",
      details: { userIds, divisionId, updatedCount: result.count },
    });

    logger.info("Admin bulk assigned division to students", { count: result.count, divisionId });
    return { success: true, count: result.count };
  }
}
