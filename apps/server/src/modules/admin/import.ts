import prisma from "@secured_attendance/db";
import { Elysia, t } from "elysia";

import { logger } from "../../lib/logger";
import { requireRole } from "../auth/guards";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CsvStudentRow {
  enrollment_no: string;
  name: string;
  email: string;
  program_code: string;
  semester: string;
  division: string;
  password?: string;
}

interface CsvTeacherRow {
  code: string;
  name: string;
  email: string;
  department?: string;
  password?: string;
}

export interface ParsedStudentRow {
  enrollmentNo: string;
  name: string;
  email: string;
  programCode: string;
  semester: number;
  division: string;
  tempPassword?: string;
  errors: string[];
}

export interface ParsedTeacherRow {
  code: string;
  name: string;
  email: string;
  department?: string;
  tempPassword?: string;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEnrollmentNo(enrollmentNo: string): {
  admissionYear: number;
  programCode: string;
  rollNumber: string;
} | null {
  // Format: 26msit006 — year(2) + programCode(2-5) + roll(3)
  const match = enrollmentNo.match(/^(\d{2})([a-z]+)(\d{3,4})$/i);
  if (!match) return null;
  return {
    admissionYear: 2000 + parseInt(match[1]!, 10),
    programCode: match[2]!.toLowerCase(),
    rollNumber: match[3]!,
  };
}

function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

// ─── CSV parsing (plain text, no external lib to keep it lightweight) ─────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });

  return { headers, rows };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export const adminImportModule = new Elysia({ prefix: "/users" })
  .use(requireRole(["admin", "super_admin"]))

  // POST /api/admin/users/bulk-import — parse CSV and return preview rows
  .post(
    "/bulk-import",
    async ({ body, status }) => {
      try {
        const { type, csv } = body;

        if (!csv || csv.trim().length === 0) {
          return status(400, { message: "CSV content is required" });
        }

        const { rows } = parseCsv(csv);

        if (type === "students") {
          const parsed: ParsedStudentRow[] = (rows as unknown as CsvStudentRow[]).map((row) => {
            const errors: string[] = [];
            const enrollmentNo = row.enrollment_no?.trim() ?? "";
            const email = row.email?.trim() ?? "";
            const name = row.name?.trim() ?? "";
            const division = row.division?.trim() ?? "";
            const semesterStr = row.semester?.trim() ?? "";

            if (!enrollmentNo) errors.push("enrollment_no is required");
            if (!email) errors.push("email is required");
            if (!name) errors.push("name is required");
            if (!division) errors.push("division is required");

            const parsed = parseEnrollmentNo(enrollmentNo);
            if (!parsed && enrollmentNo) errors.push("Invalid enrollment_no format (expected: 26msit006)");

            const semester = parseInt(semesterStr, 10);
            if (!semesterStr || isNaN(semester)) errors.push("semester must be a number");

            return {
              enrollmentNo,
              name,
              email,
              programCode: parsed?.programCode ?? row.program_code?.trim() ?? "",
              semester: isNaN(semester) ? 1 : semester,
              division,
              tempPassword: row.password ?? generateTempPassword(),
              errors,
            };
          });

          const valid = parsed.filter((r) => r.errors.length === 0);
          const invalid = parsed.filter((r) => r.errors.length > 0);

          return { type: "students", parsed, validCount: valid.length, invalidCount: invalid.length };
        }

        if (type === "teachers") {
          const parsed: ParsedTeacherRow[] = (rows as unknown as CsvTeacherRow[]).map((row) => {
            const errors: string[] = [];
            const code = row.code?.trim() ?? "";
            const email = row.email?.trim() ?? "";
            const name = row.name?.trim() ?? "";

            if (!code) errors.push("code is required");
            if (!email) errors.push("email is required");
            if (!name) errors.push("name is required");

            return {
              code,
              name,
              email,
              department: row.department?.trim(),
              tempPassword: row.password ?? generateTempPassword(),
              errors,
            };
          });

          const valid = parsed.filter((r) => r.errors.length === 0);
          const invalid = parsed.filter((r) => r.errors.length > 0);

          return { type: "teachers", parsed, validCount: valid.length, invalidCount: invalid.length };
        }

        return status(400, { message: "type must be 'students' or 'teachers'" });
      } catch (err) {
        logger.error("Bulk import preview failed", { err });
        return status(500, { message: "Failed to parse CSV" });
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal("students"), t.Literal("teachers")]),
        csv: t.String(),
      }),
    },
  )

  // POST /api/admin/users/bulk-import/confirm — persist the confirmed rows
  .post(
    "/bulk-import/confirm",
    async ({ body, status }) => {
      try {
        const { type, rows } = body;
        const results = { created: 0, skipped: 0, errors: [] as string[] };

        if (type === "students") {
          for (const row of rows as ParsedStudentRow[]) {
            try {
              const existing = await prisma.user.findUnique({ where: { email: row.email } });
              if (existing) {
                results.skipped++;
                continue;
              }

              // Create Better Auth user via prisma directly (admin-created accounts)
              const parsed = parseEnrollmentNo(row.enrollmentNo);
              const user = await prisma.user.create({
                data: {
                  id: crypto.randomUUID(),
                  name: row.name,
                  email: row.email,
                  role: "student",
                  emailVerified: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              await prisma.studentProfile.create({
                data: {
                  userId: user.id,
                  enrollmentNo: row.enrollmentNo,
                  programCode: parsed?.programCode ?? row.programCode,
                  admissionYear: parsed?.admissionYear ?? new Date().getFullYear(),
                  rollNumber: parsed?.rollNumber ?? "",
                  status: "pending",
                },
              });

              // Create account with password for Better Auth
              await prisma.account.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: user.id,
                  accountId: user.id,
                  providerId: "credential",
                  password: await Bun.password.hash(row.tempPassword!, { algorithm: "bcrypt" }),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              results.created++;
            } catch (rowErr) {
              results.errors.push(`${row.email}: ${(rowErr as Error).message}`);
            }
          }
        }

        if (type === "teachers") {
          for (const row of rows as ParsedTeacherRow[]) {
            try {
              const existing = await prisma.user.findUnique({ where: { email: row.email } });
              if (existing) {
                results.skipped++;
                continue;
              }

              const user = await prisma.user.create({
                data: {
                  id: crypto.randomUUID(),
                  name: row.name,
                  email: row.email,
                  role: "teacher",
                  emailVerified: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              await prisma.teacherProfile.create({
                data: {
                  userId: user.id,
                  code: row.code,
                  department: row.department,
                },
              });

              await prisma.account.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: user.id,
                  accountId: user.id,
                  providerId: "credential",
                  password: await Bun.password.hash(row.tempPassword!, { algorithm: "bcrypt" }),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              results.created++;
            } catch (rowErr) {
              results.errors.push(`${row.email}: ${(rowErr as Error).message}`);
            }
          }
        }

        logger.info("Bulk import completed", { type, ...results });
        return results;
      } catch (err) {
        logger.error("Bulk import confirm failed", { err });
        return status(500, { message: "Failed to create users" });
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal("students"), t.Literal("teachers")]),
        rows: t.Array(t.Unknown()),
      }),
    },
  );
