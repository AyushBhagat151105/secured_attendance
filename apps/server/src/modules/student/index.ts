import { Elysia } from "elysia";
import { requireRole } from "../auth/guards";
import { StudentService } from "./service";
import { ScanAttendanceBody } from "./model";
import { auth } from "@secured_attendance/auth";

export const studentModule = new Elysia({ prefix: "/api/student" })
  .use(requireRole(["student"]))
  
  .post("/attendance/scan", async ({ request, body }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return new Response("Unauthorized", { status: 401 });

    return StudentService.submitAttendance(session.user.id, body);
  }, { body: ScanAttendanceBody });

export type StudentModule = typeof studentModule;
