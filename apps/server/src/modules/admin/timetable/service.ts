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
        divisions: { 
          include: { 
            division: {
              include: {
                programSemester: {
                  include: { program: true }
                }
              }
            } 
          } 
        },
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
        divisions: { 
          include: { 
            division: {
              include: {
                programSemester: {
                  include: { program: true }
                }
              }
            } 
          } 
        },
      },
    });
    if (!entry) return status(404, { message: "Timetable Entry not found" });
    return entry;
  }

  private static async checkConflicts(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    teacherCodes?: string[];
    roomId?: string;
    divisionIds?: string[];
    excludeEntryId?: string;
  }) {
    const overlapping = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: data.dayOfWeek,
        id: data.excludeEntryId ? { not: data.excludeEntryId } : undefined,
        AND: [
          { startTime: { lt: data.endTime } },
          { endTime: { gt: data.startTime } },
        ],
      },
      include: {
        divisions: true,
        room: true,
      },
    });

    for (const entry of overlapping) {
      if (data.teacherCodes && entry.teacherCodes) {
        const sharedTeachers = data.teacherCodes.filter((c) => entry.teacherCodes.includes(c));
        if (sharedTeachers.length > 0) {
          throw new Error(`Teacher(s) ${sharedTeachers.join(", ")} are already booked for another class during this time.`);
        }
      }
      if (data.roomId && entry.roomId === data.roomId) {
        const typeStr = entry.room?.type ? entry.room.type.replace("_", " ") : "Room";
        const roomName = entry.room?.name || "The selected room";
        const capitalizedType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
        throw new Error(`${capitalizedType} '${roomName}' is already occupied during this time.`);
      }
      if (data.divisionIds) {
        const entryDivs = entry.divisions.map((d) => d.divisionId);
        const sharedDivs = data.divisionIds.filter((id) => entryDivs.includes(id));
        if (sharedDivs.length > 0) {
          throw new Error(`One or more divisions are already scheduled for another class during this time.`);
        }
      }
    }
  }

  static async createTimetableEntry(data: CreateTimetableEntryType) {
    const { divisionIds, ...entryData } = data;

    await this.checkConflicts({
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      teacherCodes: data.teacherCodes,
      roomId: data.roomId,
      divisionIds: data.divisionIds,
    });

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

    const existing = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!existing) throw new Error("Entry not found");

    await this.checkConflicts({
      dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      teacherCodes: data.teacherCodes ?? existing.teacherCodes,
      roomId: data.roomId ?? existing.roomId,
      divisionIds: data.divisionIds, // Assuming if null, we don't check.
      excludeEntryId: id,
    });

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
      // Skip empty periods/breaks where subjectCode is literally empty or a dash
      if (!row.subjectCode || row.subjectCode.trim() === "—" || row.subjectCode.trim() === "-" || row.subjectCode.trim() === "") {
        continue;
      }

      const errors: string[] = [];

      // Expected columns: programCode, academicYear, semester, division, subjectCode, roomName, dayOfWeek, startTime, endTime, teacherCode, type
      if (!row.programCode) errors.push("Missing programCode");
      if (!row.academicYear) errors.push("Missing academicYear");
      if (!row.semester) errors.push("Missing semester");
      if (!row.division) errors.push("Missing division");
      if (!row.subjectCode) errors.push("Missing subjectCode");
      if (!row.subjectName) errors.push("Missing subjectName");
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
      if (!row.subjectCode || row.subjectCode.trim() === "—" || row.subjectCode.trim() === "-" || row.subjectCode.trim() === "") {
        skipped++;
        continue;
      }

      try {
        // 1. Resolve or Create Academic Year
        let academicYear = await prisma.academicYear.findUnique({
          where: { name: row.academicYear },
        });
        if (!academicYear) {
          const currentYear = new Date().getFullYear();
          academicYear = await prisma.academicYear.create({
            data: {
              name: row.academicYear,
              startDate: new Date(`${currentYear}-06-01T00:00:00.000Z`),
              endDate: new Date(`${currentYear + 1}-05-31T23:59:59.999Z`),
              isCurrent: false,
            },
          });
        }

        // 2. Resolve or Create Program
        let program = await prisma.program.findUnique({
          where: { code: row.programCode },
        });
        if (!program) {
          program = await prisma.program.create({
            data: {
              code: row.programCode,
              name: row.programCode.toUpperCase(),
              shortName: row.programCode.toUpperCase(),
            },
          });
        }

        // 3. Resolve or Create ProgramSemester
        let programSemester = await prisma.programSemester.findUnique({
          where: {
            programId_academicYearId_semester: {
              programId: program.id,
              academicYearId: academicYear.id,
              semester: parseInt(row.semester, 10),
            },
          },
        });
        if (!programSemester) {
          const orgSlug = `${program.shortName.toLowerCase()}-sem-${row.semester}-${academicYear.name.toLowerCase().replace(/\s+/g, '-')}`;
          programSemester = await prisma.programSemester.create({
            data: {
              programId: program.id,
              academicYearId: academicYear.id,
              semester: parseInt(row.semester, 10),
              orgSlug,
            },
          });
        }

        // 4. Resolve or Create Division
        let division = await prisma.division.findUnique({
          where: {
            programSemesterId_name: {
              programSemesterId: programSemester.id,
              name: row.division,
            },
          },
        });
        if (!division) {
          division = await prisma.division.create({
            data: {
              name: row.division,
              programSemesterId: programSemester.id,
            },
          });
        }

        // 5. Resolve or Create Subject
        let subject = await prisma.subject.findUnique({
          where: { code: row.subjectCode },
        });
        if (!subject) {
          subject = await prisma.subject.create({
            data: {
              code: row.subjectCode,
              name: row.subjectName || row.subjectCode,
              shortName: row.subjectCode,
              programId: program.id,
            },
          });
        }

        // 6. Resolve or Create Room
        let room = await prisma.room.findFirst({
          where: { name: row.roomName },
        });
        if (!room) {
          let defaultBuilding = await prisma.building.findFirst();
          if (!defaultBuilding) {
            defaultBuilding = await prisma.building.create({
              data: {
                name: "Main Campus",
                code: "MAIN",
                gpsLat: 0,
                gpsLng: 0,
                radiusMeters: 500,
              },
            });
          }

          const lowerName = row.roomName.toLowerCase();
          let roomType = "classroom";
          if (lowerName.includes("lab")) roomType = "lab";
          else if (lowerName.includes("auditorium")) roomType = "auditorium";

          room = await prisma.room.create({
            data: {
              name: row.roomName,
              type: roomType,
              buildingId: defaultBuilding.id,
            },
          });
        }

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
