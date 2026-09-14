import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { env } from "@secured_attendance/env/server";
import { logger } from "./logger";

export const queueRedis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const connection = queueRedis;

export interface EmailJobData {
  to: string;
  subject: string;
  body?: string;
  templateId?: string;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title?: string;
  message?: string;
  data?: unknown;
}

export const auditQueue = new Queue("audit-log", {
  connection: queueRedis,
});

import prisma from "@secured_attendance/db";

export const auditWorker = new Worker(
  "audit-log",
  async (job: Job) => {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: job.data.eventType,
          actor: job.data.actor,
          actorRole: job.data.actorRole,
          targetId: job.data.targetId,
          details: job.data.details ?? {},
          ipAddress: job.data.ipAddress,
          userAgent: job.data.userAgent,
        },
      });
      logger.info("Audit event logged", { eventType: job.data.eventType, jobId: job.id });
    } catch (e) {
      logger.error("Failed to write audit log", {
        eventType: job.data.eventType,
        jobId: job.id,
        error: e,
      });
      throw e;
    }
  },
  { connection: queueRedis },
);

auditWorker.on("completed", (job: Job) => {
  logger.debug("Audit job completed", { jobId: job.id });
});

auditWorker.on("failed", (job: Job | undefined, err: Error) => {
  logger.error("Audit job failed", { jobId: job?.id, error: err.message });
});
