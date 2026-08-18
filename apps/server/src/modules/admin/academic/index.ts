import { Elysia } from "elysia";
import { requireRole } from "../../auth/guards";
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
} from "./model";
import { AcademicService } from "./service";

export const adminAcademicModule = new Elysia({ prefix: "/academic" })
  .use(requireRole(["admin", "super_admin"]))

  // ─── Academic Years ───────────────────────────────────────────────────────────
  .get("/years", async () => AcademicService.listAcademicYears(), {
    detail: { tags: ["Admin - Academic"], summary: "List academic years" },
  })
  .post("/years", async ({ body }) => AcademicService.createAcademicYear(body), {
    body: CreateAcademicYearBody,
    detail: { tags: ["Admin - Academic"], summary: "Create academic year" },
  })
  .get("/years/:id", async ({ params: { id } }) => AcademicService.getAcademicYear(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get academic year" },
  })
  .patch("/years/:id", async ({ params: { id }, body }) => AcademicService.updateAcademicYear(id, body), {
    params: IdParam,
    body: UpdateAcademicYearBody,
    detail: { tags: ["Admin - Academic"], summary: "Update academic year" },
  })
  .delete("/years/:id", async ({ params: { id } }) => AcademicService.deleteAcademicYear(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete academic year" },
  })

  // ─── Programs ─────────────────────────────────────────────────────────────────
  .get("/programs", async () => AcademicService.listPrograms(), {
    detail: { tags: ["Admin - Academic"], summary: "List programs" },
  })
  .post("/programs", async ({ body }) => AcademicService.createProgram(body), {
    body: CreateProgramBody,
    detail: { tags: ["Admin - Academic"], summary: "Create program" },
  })
  .get("/programs/:id", async ({ params: { id } }) => AcademicService.getProgram(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get program" },
  })
  .patch("/programs/:id", async ({ params: { id }, body }) => AcademicService.updateProgram(id, body), {
    params: IdParam,
    body: UpdateProgramBody,
    detail: { tags: ["Admin - Academic"], summary: "Update program" },
  })
  .delete("/programs/:id", async ({ params: { id } }) => AcademicService.deleteProgram(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete program" },
  })

  // ─── Program Semesters ────────────────────────────────────────────────────────
  .get("/semesters", async () => AcademicService.listProgramSemesters(), {
    detail: { tags: ["Admin - Academic"], summary: "List program semesters" },
  })
  .post("/semesters", async ({ body }) => AcademicService.createProgramSemester(body), {
    body: CreateProgramSemesterBody,
    detail: { tags: ["Admin - Academic"], summary: "Create program semester" },
  })
  .get("/semesters/:id", async ({ params: { id } }) => AcademicService.getProgramSemester(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get program semester" },
  })
  .patch("/semesters/:id", async ({ params: { id }, body }) => AcademicService.updateProgramSemester(id, body), {
    params: IdParam,
    body: UpdateProgramSemesterBody,
    detail: { tags: ["Admin - Academic"], summary: "Update program semester" },
  })
  .delete("/semesters/:id", async ({ params: { id } }) => AcademicService.deleteProgramSemester(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete program semester" },
  })

  // ─── Divisions ────────────────────────────────────────────────────────────────
  .get("/divisions", async () => AcademicService.listDivisions(), {
    detail: { tags: ["Admin - Academic"], summary: "List divisions" },
  })
  .post("/divisions", async ({ body }) => AcademicService.createDivision(body), {
    body: CreateDivisionBody,
    detail: { tags: ["Admin - Academic"], summary: "Create division" },
  })
  .get("/divisions/:id", async ({ params: { id } }) => AcademicService.getDivision(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get division" },
  })
  .patch("/divisions/:id", async ({ params: { id }, body }) => AcademicService.updateDivision(id, body), {
    params: IdParam,
    body: UpdateDivisionBody,
    detail: { tags: ["Admin - Academic"], summary: "Update division" },
  })
  .delete("/divisions/:id", async ({ params: { id } }) => AcademicService.deleteDivision(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete division" },
  })

  // ─── Subjects ─────────────────────────────────────────────────────────────────
  .get("/subjects", async () => AcademicService.listSubjects(), {
    detail: { tags: ["Admin - Academic"], summary: "List subjects" },
  })
  .post("/subjects", async ({ body }) => AcademicService.createSubject(body), {
    body: CreateSubjectBody,
    detail: { tags: ["Admin - Academic"], summary: "Create subject" },
  })
  .get("/subjects/:id", async ({ params: { id } }) => AcademicService.getSubject(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Get subject" },
  })
  .patch("/subjects/:id", async ({ params: { id }, body }) => AcademicService.updateSubject(id, body), {
    params: IdParam,
    body: UpdateSubjectBody,
    detail: { tags: ["Admin - Academic"], summary: "Update subject" },
  })
  .delete("/subjects/:id", async ({ params: { id } }) => AcademicService.deleteSubject(id), {
    params: IdParam,
    detail: { tags: ["Admin - Academic"], summary: "Delete subject" },
  });
