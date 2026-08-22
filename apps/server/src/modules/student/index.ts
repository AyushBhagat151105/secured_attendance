import { Elysia, t } from "elysia";
import { requireRole, authMacro } from "../auth/guards";
import { StudentService } from "./service";
import { StudentScheduleService } from "./schedule";
import { StudentHistoryService } from "./history";
import { ScanAttendanceBody, ScheduleResponse, HistoryResponse, AttendanceStats, StudentProfileResponse } from "./model";

export const studentModule = new Elysia({ prefix: "/api/student" })
  .use(requireRole(["student"]))
  .use(authMacro)
  
  .get("/profile", async ({ user }) => {
    return StudentService.getProfile(user.id);
  }, { requireAuth: true, response: StudentProfileResponse })

  .get("/schedule/today", async ({ user }) => {
    return StudentScheduleService.getTodaySchedule(user.id);
  }, { requireAuth: true, response: ScheduleResponse })

  .get("/attendance/my", async ({ user, query }) => {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    return StudentHistoryService.getHistory(user.id, page, limit);
  }, { 
    requireAuth: true,
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    response: HistoryResponse 
  })

  .get("/attendance/stats", async ({ user }) => {
    return StudentHistoryService.getStats(user.id);
  }, { requireAuth: true, response: AttendanceStats })

  .post("/attendance/scan", async ({ user, body, status }) => {
    const result = await StudentService.submitAttendance(user.id, body);
    if (!result.success) {
      switch (result.error) {
        case "NOT_FOUND": return status(404, { message: result.message });
        case "FORBIDDEN": return status(403, { message: result.message });
        default: return status(400, { message: result.message });
      }
    }
    return result;
  }, { requireAuth: true, body: ScanAttendanceBody });

export type StudentModule = typeof studentModule;
