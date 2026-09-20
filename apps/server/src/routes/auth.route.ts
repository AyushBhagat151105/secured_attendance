import { Elysia, t } from "elysia";
import { authMacro } from "../middlewares/guards";
import prisma from "@secured_attendance/db";
import { logger } from "../lib/logger";
import { queueAuditLog } from "../lib/audit";

export const authModule = new Elysia({ prefix: "/api/auth-custom" })
  .use(authMacro)
  .patch(
    "/complete-onboarding",
    async ({ user, status }: any) => {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { requiresPasswordChange: false } as any,
        });
        void queueAuditLog({
          eventType: "user.onboarding_completed",
          actor: user.id,
          actorRole: "student",
          targetId: user.id,
        });
        return { success: true };
      } catch (err) {
        logger.error("Failed to complete onboarding", { err, userId: user.id });
        return status(500, { message: "Internal Server Error" });
      }
    },
    { requireAuth: true },
  )
  .post(
    "/device-bind",
    async ({ user, body, status }: any) => {
      try {
        const profile = await prisma.studentProfile.findUnique({
          where: { userId: user.id },
        });

        if (!profile) {
          return status(404, { message: "Student profile not found" });
        }

        if (profile.deviceBound && profile.deviceId !== body.deviceId) {
          void queueAuditLog({
            eventType: "device.bind_rejected",
            actor: user.id,
            actorRole: "student",
            details: { reason: "already_bound_to_different_device", newDeviceId: body.deviceId },
          });
          return status(403, {
            message: "Your account is already bound to another device. Contact admin to rebind.",
          });
        }

        // Enforce 1-Device-per-Student: Check if this physical device is already bound to another student
        const deviceAlreadyBound = await prisma.studentProfile.findFirst({
          where: {
            deviceId: body.deviceId,
            deviceBound: true,
            userId: { not: user.id },
          },
          include: {
            user: { select: { name: true } },
          },
        });

        if (deviceAlreadyBound) {
          void queueAuditLog({
            eventType: "device.bind_conflict",
            actor: user.id,
            actorRole: "student",
            details: {
              reason: "device_already_bound_to_another_student",
              conflictUserId: deviceAlreadyBound.userId,
              deviceId: body.deviceId,
            },
          });
          return status(403, {
            message:
              "This device is already registered to another student. One device per student is strictly enforced.",
          });
        }

        await prisma.studentProfile.update({
          where: { userId: user.id },
          data: {
            deviceId: body.deviceId,
            deviceModel: body.deviceName,
            deviceBound: true,
            deviceBoundAt: new Date(),
            biometricEnabled: body.biometricEnabled ?? false,
            status: "active",
          },
        });

        void queueAuditLog({
          eventType: "device.bound",
          actor: user.id,
          actorRole: "student",
          targetId: profile.id,
          details: {
            deviceId: body.deviceId,
            deviceName: body.deviceName,
            biometricEnabled: body.biometricEnabled,
          },
        });

        return { success: true };
      } catch (err) {
        logger.error("Failed to bind device", { err, userId: user.id });
        return status(500, { message: "Internal Server Error" });
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        deviceId: t.String(),
        deviceName: t.String(),
        biometricEnabled: t.Optional(t.Boolean()),
      }),
    },
  );
