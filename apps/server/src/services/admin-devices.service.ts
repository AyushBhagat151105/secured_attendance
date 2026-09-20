import prisma from "@secured_attendance/db";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";

export interface ListRebindRequestsOptions {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListDeviceInventoryOptions {
  boundStatus?: "all" | "bound" | "unbound";
  search?: string;
  page?: number;
  limit?: number;
}

export class AdminDevicesService {
  /**
   * List all re-bind requests with optional filtering and search
   */
  static async listRebindRequests(options: ListRebindRequestsOptions = {}) {
    const { status = "PENDING", search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.studentProfile = {
        OR: [
          { enrollmentNo: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      };
    }

    const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.deviceRebindRequest.findMany({
        where,
        include: {
          studentProfile: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              division: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.deviceRebindRequest.count({ where }),
      prisma.deviceRebindRequest.count({ where: { status: "PENDING" } }),
      prisma.deviceRebindRequest.count({ where: { status: "APPROVED" } }),
      prisma.deviceRebindRequest.count({ where: { status: "REJECTED" } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }

  /**
   * Approve a rebind request:
   * 1. Updates request status to APPROVED
   * 2. Unbinds the student profile (sets deviceBound = false, deviceId = null)
   * 3. Resolves any open DEVICE_MISMATCH anomalies for this student
   * 4. Logs audit event
   */
  static async approveRebindRequest(requestId: string, adminUserId: string, server?: any) {
    const request = await prisma.deviceRebindRequest.findUnique({
      where: { id: requestId },
      include: {
        studentProfile: true,
      },
    });

    if (!request) {
      return { success: false, error: "NOT_FOUND", message: "Re-bind request not found" };
    }

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "ALREADY_PROCESSED",
        message: `Request is already ${request.status.toLowerCase()}`,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.deviceRebindRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.studentProfile.update({
        where: { id: request.studentProfileId },
        data: {
          deviceId: null,
          deviceModel: null,
          deviceOs: null,
          deviceBound: false,
          deviceBoundAt: null,
          biometricEnabled: false,
        },
      });

      await tx.anomalyAlert.updateMany({
        where: {
          userId: request.studentProfile.userId,
          type: "DEVICE_MISMATCH",
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
        },
      });

      return updatedReq;
    });

    if (server && request.studentProfile?.userId) {
      try {
        server.publish(
          `student-${request.studentProfile.userId}`,
          JSON.stringify({
            type: "DEVICE_UNBOUND",
            reason: "rebind_approved",
            requestId,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        logger.error("Failed to publish DEVICE_UNBOUND event", { error: e });
      }
    }

    void queueAuditLog({
      eventType: "device.rebind_approved",
      actor: adminUserId,
      actorRole: "admin",
      targetId: request.studentProfileId,
      details: {
        requestId,
        studentEnrollmentNo: request.studentProfile.enrollmentNo,
        requestedDeviceId: request.requestedDeviceId,
        requestedDeviceModel: request.requestedDeviceModel,
      },
    });

    logger.info("Device rebind approved", {
      requestId,
      studentProfileId: request.studentProfileId,
      adminUserId,
    });

    return { success: true, request: result };
  }

  /**
   * Reject a rebind request with an optional note
   */
  static async rejectRebindRequest(
    requestId: string,
    adminUserId: string,
    note?: string,
    server?: any,
  ) {
    const request = await prisma.deviceRebindRequest.findUnique({
      where: { id: requestId },
      include: {
        studentProfile: true,
      },
    });

    if (!request) {
      return { success: false, error: "NOT_FOUND", message: "Re-bind request not found" };
    }

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "ALREADY_PROCESSED",
        message: `Request is already ${request.status.toLowerCase()}`,
      };
    }

    const updatedReq = await prisma.deviceRebindRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    });

    if (server && request.studentProfile?.userId) {
      try {
        server.publish(
          `student-${request.studentProfile.userId}`,
          JSON.stringify({
            type: "REBIND_STATUS_CHANGED",
            status: "REJECTED",
            requestId,
            note: note?.trim() || null,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        logger.error("Failed to publish REBIND_STATUS_CHANGED event", { error: e });
      }
    }

    void queueAuditLog({
      eventType: "device.rebind_rejected",
      actor: adminUserId,
      actorRole: "admin",
      targetId: request.studentProfileId,
      details: {
        requestId,
        studentEnrollmentNo: request.studentProfile.enrollmentNo,
        note,
      },
    });

    logger.info("Device rebind rejected", {
      requestId,
      studentProfileId: request.studentProfileId,
      adminUserId,
    });

    return { success: true, request: updatedReq };
  }

  /**
   * Device inventory list
   */
  static async listInventory(options: ListDeviceInventoryOptions = {}) {
    const { boundStatus = "all", search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (boundStatus === "bound") {
      where.deviceBound = true;
    } else if (boundStatus === "unbound") {
      where.deviceBound = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { enrollmentNo: { contains: q, mode: "insensitive" } },
        { deviceModel: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total, boundCount, unboundCount] = await Promise.all([
      prisma.studentProfile.findMany({
        where,
        select: {
          id: true,
          userId: true,
          enrollmentNo: true,
          programCode: true,
          admissionYear: true,
          rollNumber: true,
          deviceId: true,
          deviceModel: true,
          deviceOs: true,
          deviceBound: true,
          deviceBoundAt: true,
          biometricEnabled: true,
          status: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          division: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ deviceBound: "desc" }, { enrollmentNo: "asc" }],
        skip,
        take: limit,
      }),
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.count({ where: { deviceBound: true } }),
      prisma.studentProfile.count({ where: { deviceBound: false } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      counts: {
        bound: boundCount,
        unbound: unboundCount,
        total: boundCount + unboundCount,
      },
    };
  }

  /**
   * Reset binding for a single student profile
   */
  static async resetStudentDevice(studentProfileId: string, adminUserId: string, server?: any) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      return { success: false, error: "NOT_FOUND", message: "Student profile not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: studentProfileId },
        data: {
          deviceId: null,
          deviceModel: null,
          deviceOs: null,
          deviceBound: false,
          deviceBoundAt: null,
          biometricEnabled: false,
        },
      });

      await tx.anomalyAlert.updateMany({
        where: {
          userId: profile.userId,
          type: "DEVICE_MISMATCH",
          status: "OPEN",
        },
        data: { status: "RESOLVED" },
      });
    });

    if (server && profile.userId) {
      try {
        server.publish(
          `student-${profile.userId}`,
          JSON.stringify({
            type: "DEVICE_UNBOUND",
            reason: "admin_reset",
            studentProfileId,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        logger.error("Failed to publish DEVICE_UNBOUND event", { error: e });
      }
    }

    void queueAuditLog({
      eventType: "device.rebound",
      actor: adminUserId,
      actorRole: "admin",
      targetId: studentProfileId,
      details: {
        enrollmentNo: profile.enrollmentNo,
        previousDeviceId: profile.deviceId,
        previousDeviceModel: profile.deviceModel,
      },
    });

    logger.info("Student device binding reset by admin", {
      studentProfileId,
      adminUserId,
    });

    return { success: true };
  }

  /**
   * Batch reset device bindings for multiple student profiles
   */
  static async batchResetDevices(
    studentProfileIds: string[],
    adminUserId: string,
    server?: any,
  ) {
    if (!studentProfileIds || studentProfileIds.length === 0) {
      return { success: false, error: "INVALID_INPUT", message: "No students selected" };
    }

    const profiles = await prisma.studentProfile.findMany({
      where: { id: { in: studentProfileIds } },
      select: { id: true, userId: true, enrollmentNo: true },
    });

    const userIds = profiles.map((p) => p.userId);

    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.updateMany({
        where: { id: { in: studentProfileIds } },
        data: {
          deviceId: null,
          deviceModel: null,
          deviceOs: null,
          deviceBound: false,
          deviceBoundAt: null,
          biometricEnabled: false,
        },
      });

      if (userIds.length > 0) {
        await tx.anomalyAlert.updateMany({
          where: {
            userId: { in: userIds },
            type: "DEVICE_MISMATCH",
            status: "OPEN",
          },
          data: { status: "RESOLVED" },
        });
      }
    });

    if (server) {
      for (const p of profiles) {
        if (p.userId) {
          try {
            server.publish(
              `student-${p.userId}`,
              JSON.stringify({
                type: "DEVICE_UNBOUND",
                reason: "batch_reset",
                studentProfileId: p.id,
                timestamp: Date.now(),
              }),
            );
          } catch (e) {
            logger.error("Failed to publish DEVICE_UNBOUND event in batch", {
              error: e,
              userId: p.userId,
            });
          }
        }
      }
    }

    void queueAuditLog({
      eventType: "device.batch_rebound",
      actor: adminUserId,
      actorRole: "admin",
      targetId: "batch",
      details: {
        count: studentProfileIds.length,
        studentProfileIds,
      },
    });

    logger.info("Batch reset student devices completed", {
      count: studentProfileIds.length,
      adminUserId,
    });

    return { success: true, count: studentProfileIds.length };
  }
}
