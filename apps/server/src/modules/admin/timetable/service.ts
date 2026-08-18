import prisma from "@secured_attendance/db";
import { status } from "elysia";
import Papa from "papaparse";
import type {
  BulkTimetableImportConfirmType,
  BulkTimetableImportType,
  CreateTimetableEntryType,
  UpdateTimetableEntryType,
} from "./model";

export class TimetableService {
  // ─── Timetable Entries ───────────────────────────────────────────────────────
  static async listTimetableEntries() {
    return prisma.timetableEntry.findMany({
      include: {
        subject: true,
        room: true,
        divisions: { include: { division: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  static async getTimetableEntry(id: string) {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id },
      include: {
        subject: true,
        room: true,
        divisions: { include: { division: true } },
      },
    });
    if (!entry) return status(404, { message: "Timetable Entry not found" });
    return entry;
  }

  static async createTimetableEntry(data: CreateTimetableEntryType) {
    const { divisionIds, ...entryData } = data;

    const entry = await prisma.timetableEntry.create({
      data: {
        ...entryData,
        divisions: {
          create: divisionIds.map((id) => ({ divisionId: id })),
        },
      },
    });

    return entry;
  }

  static async updateTimetableEntry(id: string, data: UpdateTimetableEntryType) {
    const { divisionIds, ...updateData } = data;

    // If updating divisions, delete existing and recreate
    if (divisionIds) {
      await prisma.timetableEntryDivision.deleteMany({
        where: { timetableEntryId: id },
      });
      await prisma.timetableEntryDivision.createMany({
        data: divisionIds.map((divId) => ({
          timetableEntryId: id,
          divisionId: divId,
        })),
      });
    }

    return prisma.timetableEntry.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteTimetableEntry(id: string) {
    await prisma.timetableEntry.delete({ where: { id } });
    return { success: true };
  }

  // ─── Bulk Import ────────────────────────────────────────────────────────────
  static async previewImport(data: BulkTimetableImportType) {
    const { data: parsedRows } = Papa.parse(data.csv, {
      header: true,
      skipEmptyLines: true,
    });

    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const row of parsedRows as any[]) {
      const errors: string[] = [];

      // Expected columns: programCode, academicYear, semester, division, subjectCode, roomName, dayOfWeek, startTime, endTime, teacherCode, type
      if (!row.programCode) errors.push("Missing programCode");
      if (!row.academicYear) errors.push("Missing academicYear");
      if (!row.semester) errors.push("Missing semester");
      if (!row.division) errors.push("Missing division");
      if (!row.subjectCode) errors.push("Missing subjectCode");
      if (!row.roomName) errors.push("Missing roomName");
      if (!row.dayOfWeek) errors.push("Missing dayOfWeek (0-6)");
      if (!row.startTime) errors.push("Missing startTime");
      if (!row.endTime) errors.push("Missing endTime");
      if (!row.teacherCode) errors.push("Missing teacherCode");

      if (errors.length === 0) {
        validCount++;
      } else {
        invalidCount++;
      }

      results.push({ ...row, errors });
    }

    return {
      parsed: results,
      validCount,
      invalidCount,
    };
  }

  static async confirmImport(data: BulkTimetableImportConfirmType) {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of data.rows.entries()) {
      try {
        // 1. Resolve Academic Year
        const academicYear = await prisma.academicYear.findUnique({
          where: { name: row.academicYear },
        });
        if (!academicYear) throw new Error(`Academic year '${row.academicYear}' not found`);

        // 2. Resolve Program
        const program = await prisma.program.findUnique({
          where: { code: row.programCode },
        });
        if (!program) throw new Error(`Program code '${row.programCode}' not found`);

        // 3. Resolve ProgramSemester
        const programSemester = await prisma.programSemester.findUnique({
          where: {
            programId_academicYearId_semester: {
              programId: program.id,
              academicYearId: academicYear.id,
              semester: parseInt(row.semester, 10),
            },
          },
        });
        if (!programSemester) throw new Error(`ProgramSemester not found for ${program.code} Sem ${row.semester}`);

        // 4. Resolve Division
        const division = await prisma.division.findUnique({
          where: {
            programSemesterId_name: {
              programSemesterId: programSemester.id,
              name: row.division,
            },
          },
        });
        if (!division) throw new Error(`Division '${row.division}' not found`);

        // 5. Resolve Subject
        const subject = await prisma.subject.findUnique({
          where: { code: row.subjectCode },
        });
        if (!subject) throw new Error(`Subject '${row.subjectCode}' not found`);

        // 6. Resolve Room
        const room = await prisma.room.findFirst({
          where: { name: row.roomName },
        });
        if (!room) throw new Error(`Room '${row.roomName}' not found`);

        // 7. Parse dayOfWeek and teachers
        const dayOfWeek = parseInt(row.dayOfWeek, 10);
        const teacherCodes = row.teacherCode.split(",").map((t: string) => t.trim());

        // Check for exact duplicate
        const existing = await prisma.timetableEntry.findFirst({
          where: {
            programSemesterId: programSemester.id,
            academicYearId: academicYear.id,
            subjectId: subject.id,
            roomId: room.id,
            dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime,
            divisions: {
              some: { divisionId: division.id }
            }
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.timetableEntry.create({
          data: {
            programSemesterId: programSemester.id,
            academicYearId: academicYear.id,
            subjectId: subject.id,
            roomId: room.id,
            dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime,
            type: row.type || "lecture",
            teacherCodes,
            divisions: {
              create: [{ divisionId: division.id }],
            },
          },
        });

        created++;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    }

    return { created, skipped, errors };
  }
}
