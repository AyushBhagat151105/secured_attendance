import { Elysia, t } from "elysia";
import { requireRole, authMacro } from "../middlewares/guards";
import { StudentService } from "../services/student.service";
import { StudentScheduleService } from "../services/student-schedule.service";
import { StudentHistoryService } from "../services/student-history.service";
import {
  ScanAttendanceBody,
  ScheduleResponse,
  HistoryResponse,
  AttendanceStats,
  StudentProfileResponse,
} from "../models/student.model";

export const studentModule = new Elysia({ prefix: "/api/student" })
  .use(requireRole(["student"]))
  .use(authMacro)

  .get(
    "/profile",
    async ({ user }: any) => {
      return StudentService.getProfile(user.id);
    },
    { requireAuth: true, response: StudentProfileResponse },
  )

  .get(
    "/schedule/today",
    async ({ user }: any) => {
      return StudentScheduleService.getTodaySchedule(user.id);
    },
    { requireAuth: true, response: ScheduleResponse },
  )

  .get(
    "/attendance/my",
    async ({ user, query }: any) => {
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 20;
      return StudentHistoryService.getHistory(user.id, page, limit);
    },
    {
      requireAuth: true,
      query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
      response: HistoryResponse,
    },
  )

  .get(
    "/attendance/stats",
    async ({ user }: any) => {
      return StudentHistoryService.getStats(user.id);
    },
    { requireAuth: true, response: AttendanceStats },
  )

  .post(
    "/attendance/scan",
    async ({ user, body, status, server }: any) => {
      const result = await StudentService.submitAttendance(user.id, body, server);
      if (!result.success) {
        switch (result.error) {
          case "NOT_FOUND":
            return status(404, { message: result.message });
          case "FORBIDDEN":
            return status(403, { message: result.message });
          default:
            return status(400, { message: result.message });
        }
      }
      return result;
    },
    { requireAuth: true, body: ScanAttendanceBody },
  )

  .post(
    "/device/rebind-request",
    async ({ user, body, status }: any) => {
      const result = await StudentService.requestDeviceRebind(user.id, body);
      if (!result.success) {
        switch (result.error) {
          case "NOT_FOUND":
            return status(404, { message: result.message });
          case "NOT_BOUND":
          case "ALREADY_PENDING":
          case "DEVICE_ALREADY_IN_USE":
            return status(400, { message: result.message });
          default:
            return status(400, { message: result.message });
        }
      }
      return result;
    },
    {
      requireAuth: true,
      body: t.Object({
        requestedDeviceId: t.String(),
        requestedDeviceModel: t.String(),
        requestedDeviceOs: t.Optional(t.String()),
        reason: t.String({ minLength: 3 }),
      }),
    },
  )

  .get(
    "/device/rebind-request/status",
    async ({ user, status }: any) => {
      const result = await StudentService.getDeviceRebindStatus(user.id);
      if (!result.success) {
        return status(404, { message: result.message });
      }
      return result;
    },
    { requireAuth: true },
  );

export type StudentModule = typeof studentModule;
