import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { env } from "@secured_attendance/env/server";

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
  data?: any;
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
      console.log(`[Audit] Logged event: ${job.data.eventType}`);
    } catch (e) {
      console.error(`[Audit] Failed to log event: ${job.data.eventType}`, e);
      throw e;
    }
  },
  { connection: queueRedis }
);

auditWorker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} has completed!`);
});

auditWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
