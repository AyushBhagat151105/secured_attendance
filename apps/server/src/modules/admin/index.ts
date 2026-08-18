import { Elysia } from "elysia";

import { adminImportModule } from "./import";
import { adminUsersModule } from "./users/index";
import { adminAcademicModule } from "./academic/index";
import { adminCampusModule } from "./campus/index";
import { adminTimetableModule } from "./timetable/index";

/**
 * Admin module — groups all admin routes under /api/admin
 * Requires admin or super_admin role (enforced per sub-module)
 */
export const adminModule = new Elysia({ prefix: "/api/admin" })
  .use(adminUsersModule)
  .use(adminImportModule)
  .use(adminAcademicModule)
  .use(adminCampusModule)
  .use(adminTimetableModule);

export type { AdminModule };
type AdminModule = typeof adminModule;
