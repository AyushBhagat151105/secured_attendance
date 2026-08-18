import { Elysia } from "elysia";

import { adminImportModule } from "./import";
import { adminUsersModule } from "./users";

/**
 * Admin module — groups all admin routes under /api/admin
 * Requires admin or super_admin role (enforced per sub-module)
 */
export const adminModule = new Elysia({ prefix: "/api/admin" })
  .use(adminUsersModule)
  .use(adminImportModule);

export type { AdminModule };
type AdminModule = typeof adminModule;
