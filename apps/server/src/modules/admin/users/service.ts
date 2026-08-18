import prisma from "@secured_attendance/db";
import { logger } from "../../../lib/logger";
import type { UpdateUserType, UsersListQueryType } from "./model";
import { status } from "elysia";

export class AdminUsersService {
  static async listUsers(query: UsersListQueryType) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status
        ? {
            OR: [{ studentProfile: { status: query.status } }],
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

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
              enrollmentNo: true,
              status: true,
              deviceBound: true,
              deviceModel: true,
              programCode: true,
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

    if (existing.role === "student") {
      await prisma.studentProfile.updateMany({
        where: { userId: id },
        data: { status: "suspended" },
      });
    }

    logger.info("User suspended", { userId: id });
    return { success: true };
  }

  static async rebindDevice(id: string) {
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

    logger.info("Device rebound by admin", { userId: id });
    return { success: true };
  }
}
