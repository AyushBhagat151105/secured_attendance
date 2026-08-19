import { Elysia } from "elysia";
import { authMacro } from "./guards";
import prisma from "@secured_attendance/db";
import { logger } from "../../lib/logger";

export const authModule = new Elysia({ prefix: "/api/auth-custom" })
  .use(authMacro)
  .patch("/complete-onboarding", async ({ user, status }) => {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { requiresPasswordChange: false } as any,
      });
      return { success: true };
    } catch (err) {
      logger.error("Failed to complete onboarding", { err, userId: user.id });
      return status(500, { message: "Internal Server Error" });
    }
  }, { requireAuth: true });
