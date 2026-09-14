import { Elysia, status } from "elysia";
import prisma from "@secured_attendance/db";
import { requireRole } from "../middlewares/guards";
import {
  CreateAcademicYearBody,
  CreateDivisionBody,
  CreateProgramBody,
  CreateProgramSemesterBody,
  CreateSubjectBody,
  IdParam,
  UpdateAcademicYearBody,
  UpdateDivisionBody,
  UpdateProgramBody,
  UpdateProgramSemesterBody,
  UpdateSubjectBody,
} from "../models/admin-academic.model";

export const adminAcademicModule = new Elysia({ prefix: "/academic" })
  .use(requireRole(["admin", "super_admin"]))

  // ─── Academic Years ───────────────────────────────────────────────────────────
  .get("/years", async () => {
    return prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  }, {
    detail: { tags: ["Admin - Academic"], summary: "List academic years" },
  })
  .post("/years", async ({ body }) => {
    if (body.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return prisma.academicYear.create({ data: body });
  }, {
    body: CreateAcademicYearBody,
    detail: { tags: ["Admin - Academic"], summary: "Create academic year" },
  })
  .get("/years/:id", async ({ params: { id } }) => {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) return status(404, { message: "Academic Year not found" });
    return year;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get academic year" },
  })
  .patch("/years/:id", async ({ params: { id }, body }) => {
    if (body.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return prisma.academicYear.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateAcademicYearBody,
    detail: { tags: ["Admin - Academic"], summary: "Update academic year" },
  })
  .delete("/years/:id", async ({ params: { id } }) => {
    await prisma.academicYear.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete academic year" },
  })

  // ─── Programs ─────────────────────────────────────────────────────────────────
  .get("/programs", async () => {
    return prisma.program.findMany({ orderBy: { name: "asc" } });
  }, {
    detail: { tags: ["Admin - Academic"], summary: "List programs" },
  })
  .post("/programs", async ({ body }) => {
    return prisma.program.create({ data: body });
  }, {
    body: CreateProgramBody,
    detail: { tags: ["Admin - Academic"], summary: "Create program" },
  })
  .get("/programs/:id", async ({ params: { id } }) => {
    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) return status(404, { message: "Program not found" });
    return program;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get program" },
  })
  .patch("/programs/:id", async ({ params: { id }, body }) => {
    return prisma.program.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateProgramBody,
    detail: { tags: ["Admin - Academic"], summary: "Update program" },
  })
  .delete("/programs/:id", async ({ params: { id } }) => {
    await prisma.program.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete program" },
  })

  // ─── Program Semesters ────────────────────────────────────────────────────────
  .get("/semesters", async () => {
    return prisma.programSemester.findMany({
      include: { program: true, academicYear: true },
      orderBy: { semester: "asc" },
    });
  }, {
    detail: { tags: ["Admin - Academic"], summary: "List program semesters" },
  })
  .post("/semesters", async ({ body }) => {
    const program = await prisma.program.findUnique({ where: { id: body.programId } });
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: body.academicYearId },
    });

    if (!program || !academicYear) {
      return status(400, { message: "Invalid program or academic year" });
    }

    const orgSlug = `${program.shortName.toLowerCase()}-sem-${body.semester}-${academicYear.name.toLowerCase().replace(/\s+/g, "-")}`;

    return prisma.programSemester.create({
      data: {
        ...body,
        orgSlug,
      },
    });
  }, {
    body: CreateProgramSemesterBody,
    detail: { tags: ["Admin - Academic"], summary: "Create program semester" },
  })
  .get("/semesters/:id", async ({ params: { id } }) => {
    const ps = await prisma.programSemester.findUnique({
      where: { id },
      include: { program: true, academicYear: true },
    });
    if (!ps) return status(404, { message: "Program Semester not found" });
    return ps;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get program semester" },
  })
  .patch("/semesters/:id", async ({ params: { id }, body }) => {
    return prisma.programSemester.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateProgramSemesterBody,
    detail: { tags: ["Admin - Academic"], summary: "Update program semester" },
  })
  .delete("/semesters/:id", async ({ params: { id } }) => {
    await prisma.programSemester.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete program semester" },
  })

  // ─── Divisions ────────────────────────────────────────────────────────────────
  .get("/divisions", async () => {
    return prisma.division.findMany({
      include: { programSemester: { include: { program: true, academicYear: true } } },
      orderBy: [{ programSemester: { semester: "asc" } }, { name: "asc" }],
    });
  }, {
    detail: { tags: ["Admin - Academic"], summary: "List divisions" },
  })
  .post("/divisions", async ({ body }) => {
    return prisma.division.create({ data: body });
  }, {
    body: CreateDivisionBody,
    detail: { tags: ["Admin - Academic"], summary: "Create division" },
  })
  .get("/divisions/:id", async ({ params: { id } }) => {
    const division = await prisma.division.findUnique({
      where: { id },
      include: { programSemester: { include: { program: true, academicYear: true } } },
    });
    if (!division) return status(404, { message: "Division not found" });
    return division;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get division" },
  })
  .patch("/divisions/:id", async ({ params: { id }, body }) => {
    return prisma.division.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateDivisionBody,
    detail: { tags: ["Admin - Academic"], summary: "Update division" },
  })
  .delete("/divisions/:id", async ({ params: { id } }) => {
    await prisma.division.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete division" },
  })

  // ─── Subjects ─────────────────────────────────────────────────────────────────
  .get("/subjects", async () => {
    return prisma.subject.findMany({
      include: { program: true },
      orderBy: { code: "asc" },
    });
  }, {
    detail: { tags: ["Admin - Academic"], summary: "List subjects" },
  })
  .post("/subjects", async ({ body }) => {
    return prisma.subject.create({ data: body });
  }, {
    body: CreateSubjectBody,
    detail: { tags: ["Admin - Academic"], summary: "Create subject" },
  })
  .get("/subjects/:id", async ({ params: { id } }) => {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!subject) return status(404, { message: "Subject not found" });
    return subject;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get subject" },
  })
  .patch("/subjects/:id", async ({ params: { id }, body }) => {
    return prisma.subject.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateSubjectBody,
    detail: { tags: ["Admin - Academic"], summary: "Update subject" },
  })
  .delete("/subjects/:id", async ({ params: { id } }) => {
    await prisma.subject.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete subject" },
  });
