import { Elysia } from "elysia";

import { adminImportModule } from "../services/admin-import.service";
import { adminUsersModule } from "./admin-users.route";
import { adminAcademicModule } from "./admin-academic.route";
import { adminCampusModule } from "./admin-campus.route";
import { adminTimetableModule } from "./admin-timetable.route";
import { adminReportModule } from "./admin-reports.route";

/**
 * Admin module — groups all admin routes under /api/admin
 * Requires admin or super_admin role (enforced per sub-module)
 */
export const adminModule = new Elysia({ prefix: "/api/admin" })
  .use(adminUsersModule)
  .use(adminImportModule)
  .use(adminAcademicModule)
  .use(adminCampusModule)
  .use(adminTimetableModule)
  .use(adminReportModule);

export type { AdminModule };
type AdminModule = typeof adminModule;
