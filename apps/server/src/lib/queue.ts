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

export const auditWorker = new Worker(
  "audit-log",
  async (job: Job) => {
    console.log(`Processing audit log: ${job.id}`, job.data);
  },
  { connection: queueRedis }
);

auditWorker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} has completed!`);
});

auditWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
