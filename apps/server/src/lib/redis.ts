import { Redis } from "ioredis";
import { env } from "@secured_attendance/env/server";

export const attendanceRedis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  keyPrefix: "att:",
});

attendanceRedis.on("connect", () => {
  console.log("Redis (Attendance) connected");
});

attendanceRedis.on("error", (err) => {
  console.error("Redis (Attendance) connection error:", err);
});
