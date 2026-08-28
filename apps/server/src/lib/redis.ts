import { Redis } from "ioredis";
import { env } from "@secured_attendance/env/server";
import { logger } from "./logger";

export const attendanceRedis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  keyPrefix: "att:",
});

attendanceRedis.on("connect", () => {
  logger.info("Redis (Attendance) connected");
});

attendanceRedis.on("error", (err) => {
  logger.error("Redis (Attendance) connection error", { err });
});
