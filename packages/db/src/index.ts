import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@secured_attendance/env/server";
import { Pool } from "pg";

import { PrismaClient } from "../prisma/generated/client";

// Shared connection pool optimized for NeonDB serverless PostgreSQL
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;

