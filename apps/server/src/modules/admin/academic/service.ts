import prisma from "@secured_attendance/db";
import { status } from "elysia";
import type {
  CreateAcademicYearType,
  CreateDivisionType,
  CreateProgramSemesterType,
  CreateProgramType,
  CreateSubjectType,
  UpdateAcademicYearType,
  UpdateDivisionType,
  UpdateProgramSemesterType,
  UpdateProgramType,
  UpdateSubjectType,
} from "./model";

export class AcademicService {
  // ─── Academic Year ──────────────────────────────────────────────────────────
  static async listAcademicYears() {
    return prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  }

  static async getAcademicYear(id: string) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) return status(404, { message: "Academic Year not found" });
    return year;
  }

  static async createAcademicYear(data: CreateAcademicYearType) {
    if (data.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return prisma.academicYear.create({ data });
  }

  static async updateAcademicYear(id: string, data: UpdateAcademicYearType) {
    if (data.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return prisma.academicYear.update({ where: { id }, data });
  }

  static async deleteAcademicYear(id: string) {
    await prisma.academicYear.delete({ where: { id } });
    return { success: true };
  }

  // ─── Program ────────────────────────────────────────────────────────────────
  static async listPrograms() {
    return prisma.program.findMany({ orderBy: { name: "asc" } });
  }

  static async getProgram(id: string) {
    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) return status(404, { message: "Program not found" });
    return program;
  }

  static async createProgram(data: CreateProgramType) {
    return prisma.program.create({ data });
  }

  static async updateProgram(id: string, data: UpdateProgramType) {
    return prisma.program.update({ where: { id }, data });
  }

  static async deleteProgram(id: string) {
    await prisma.program.delete({ where: { id } });
    return { success: true };
  }

  // ─── Program Semester ───────────────────────────────────────────────────────
  static async listProgramSemesters() {
    return prisma.programSemester.findMany({
      include: { program: true, academicYear: true },
      orderBy: { semester: "asc" },
    });
  }

  static async getProgramSemester(id: string) {
    const ps = await prisma.programSemester.findUnique({
      where: { id },
      include: { program: true, academicYear: true },
    });
    if (!ps) return status(404, { message: "Program Semester not found" });
    return ps;
  }

  static async createProgramSemester(data: CreateProgramSemesterType) {
    const program = await prisma.program.findUnique({ where: { id: data.programId } });
    const academicYear = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });

    if (!program || !academicYear) {
      return status(400, { message: "Invalid program or academic year" });
    }

    const orgSlug = `${program.shortName.toLowerCase()}-sem-${data.semester}-${academicYear.name.toLowerCase().replace(/\s+/g, '-')}`;

    return prisma.programSemester.create({
      data: {
        ...data,
        orgSlug,
      },
    });
  }

  static async updateProgramSemester(id: string, data: UpdateProgramSemesterType) {
    return prisma.programSemester.update({ where: { id }, data });
  }

  static async deleteProgramSemester(id: string) {
    await prisma.programSemester.delete({ where: { id } });
    return { success: true };
  }

  // ─── Division ───────────────────────────────────────────────────────────────
  static async listDivisions() {
    return prisma.division.findMany({
      include: { programSemester: { include: { program: true, academicYear: true } } },
      orderBy: { name: "asc" },
    });
  }

  static async getDivision(id: string) {
    const division = await prisma.division.findUnique({
      where: { id },
      include: { programSemester: true },
    });
    if (!division) return status(404, { message: "Division not found" });
    return division;
  }

  static async createDivision(data: CreateDivisionType) {
    return prisma.division.create({ data });
  }

  static async updateDivision(id: string, data: UpdateDivisionType) {
    return prisma.division.update({ where: { id }, data });
  }

  static async deleteDivision(id: string) {
    await prisma.division.delete({ where: { id } });
    return { success: true };
  }

  // ─── Subject ────────────────────────────────────────────────────────────────
  static async listSubjects() {
    return prisma.subject.findMany({
      include: { program: true },
      orderBy: { name: "asc" },
    });
  }

  static async getSubject(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!subject) return status(404, { message: "Subject not found" });
    return subject;
  }

  static async createSubject(data: CreateSubjectType) {
    return prisma.subject.create({ data });
  }

  static async updateSubject(id: string, data: UpdateSubjectType) {
    return prisma.subject.update({ where: { id }, data });
  }

  static async deleteSubject(id: string) {
    await prisma.subject.delete({ where: { id } });
    return { success: true };
  }
}
