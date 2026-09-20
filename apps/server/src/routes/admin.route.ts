import { Elysia } from "elysia";

import { adminImportModule } from "../services/admin-import.service";
import { adminUsersModule } from "./admin-users.route";
import { adminAcademicModule } from "./admin-academic.route";
import { adminCampusModule } from "./admin-campus.route";
import { adminTimetableModule } from "./admin-timetable.route";
import { adminReportModule } from "./admin-reports.route";
import { adminAnomaliesModule } from "./admin-anomalies.route";
import { adminAuditModule } from "./admin-audit.route";
import { adminDevicesModule } from "./admin-devices.route";

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
  .use(adminReportModule)
  .use(adminAnomaliesModule)
  .use(adminAuditModule)
  .use(adminDevicesModule);

export type { AdminModule };
type AdminModule = typeof adminModule;
