import { t } from "elysia";

// ─── Shared Models ────────────────────────────────────────────────────────────
export const IdParam = t.Object({ id: t.String() });

// ─── Academic Year Models ─────────────────────────────────────────────────────
export const AcademicYearModel = t.Object({
  id: t.String(),
  name: t.String(),
  startDate: t.String({ format: "date-time" }),
  endDate: t.String({ format: "date-time" }),
  isCurrent: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateAcademicYearBody = t.Object({
  name: t.String({ minLength: 2 }),
  startDate: t.String({ format: "date-time" }),
  endDate: t.String({ format: "date-time" }),
  isCurrent: t.Optional(t.Boolean()),
});

export const UpdateAcademicYearBody = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  startDate: t.Optional(t.String({ format: "date-time" })),
  endDate: t.Optional(t.String({ format: "date-time" })),
  isCurrent: t.Optional(t.Boolean()),
});

// ─── Program Models ───────────────────────────────────────────────────────────
export const ProgramModel = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  shortName: t.String(),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateProgramBody = t.Object({
  name: t.String({ minLength: 2 }),
  code: t.String({ minLength: 2 }),
  shortName: t.String({ minLength: 2 }),
});

export const UpdateProgramBody = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  code: t.Optional(t.String({ minLength: 2 })),
  shortName: t.Optional(t.String({ minLength: 2 })),
});

// ─── Program Semester Models ──────────────────────────────────────────────────
export const ProgramSemesterModel = t.Object({
  id: t.String(),
  programId: t.String(),
  academicYearId: t.String(),
  semester: t.Number(),
  orgSlug: t.String(),
});

export const CreateProgramSemesterBody = t.Object({
  programId: t.String(),
  academicYearId: t.String(),
  semester: t.Number({ minimum: 1, maximum: 10 }),
});

export const UpdateProgramSemesterBody = t.Object({
  semester: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
});

// ─── Division Models ──────────────────────────────────────────────────────────
export const DivisionModel = t.Object({
  id: t.String(),
  name: t.String(),
  programSemesterId: t.String(),
});

export const CreateDivisionBody = t.Object({
  name: t.String({ minLength: 1 }),
  programSemesterId: t.String(),
});

export const UpdateDivisionBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
});

// ─── Subject Models ───────────────────────────────────────────────────────────
export const SubjectModel = t.Object({
  id: t.String(),
  code: t.String(),
  name: t.String(),
  shortName: t.Union([t.String(), t.Null()]),
  programId: t.String(),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateSubjectBody = t.Object({
  code: t.String({ minLength: 2 }),
  name: t.String({ minLength: 2 }),
  shortName: t.Optional(t.String()),
  programId: t.String(),
});

export const UpdateSubjectBody = t.Object({
  code: t.Optional(t.String({ minLength: 2 })),
  name: t.Optional(t.String({ minLength: 2 })),
  shortName: t.Optional(t.String()),
  programId: t.Optional(t.String()),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type IdParamType = typeof IdParam.static;
export type CreateAcademicYearType = typeof CreateAcademicYearBody.static;
export type UpdateAcademicYearType = typeof UpdateAcademicYearBody.static;
export type CreateProgramType = typeof CreateProgramBody.static;
export type UpdateProgramType = typeof UpdateProgramBody.static;
export type CreateProgramSemesterType = typeof CreateProgramSemesterBody.static;
export type UpdateProgramSemesterType = typeof UpdateProgramSemesterBody.static;
export type CreateDivisionType = typeof CreateDivisionBody.static;
export type UpdateDivisionType = typeof UpdateDivisionBody.static;
export type CreateSubjectType = typeof CreateSubjectBody.static;
export type UpdateSubjectType = typeof UpdateSubjectBody.static;
