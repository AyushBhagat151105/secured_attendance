import { t } from "elysia";
import { IdParam } from "../academic/model";

export { IdParam };

// ─── Timetable Entry Models ───────────────────────────────────────────────────
export const TimetableEntryModel = t.Object({
  id: t.String(),
  programSemesterId: t.String(),
  academicYearId: t.String(),
  subjectId: t.String(),
  roomId: t.String(),
  dayOfWeek: t.Number(),
  startTime: t.String(),
  endTime: t.String(),
  type: t.String(),
  teacherCodes: t.Array(t.String()),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateTimetableEntryBody = t.Object({
  programSemesterId: t.String(),
  academicYearId: t.String(),
  subjectId: t.String(),
  roomId: t.String(),
  dayOfWeek: t.Number({ minimum: 0, maximum: 6 }),
  startTime: t.String(), // "09:10"
  endTime: t.String(),   // "10:10"
  type: t.Optional(t.String()),
  teacherCodes: t.Array(t.String()),
  divisionIds: t.Array(t.String()), // Linked divisions
});

export const UpdateTimetableEntryBody = t.Object({
  subjectId: t.Optional(t.String()),
  roomId: t.Optional(t.String()),
  dayOfWeek: t.Optional(t.Number({ minimum: 0, maximum: 6 })),
  startTime: t.Optional(t.String()),
  endTime: t.Optional(t.String()),
  type: t.Optional(t.String()),
  teacherCodes: t.Optional(t.Array(t.String())),
  divisionIds: t.Optional(t.Array(t.String())),
});

// ─── Bulk Import Models ───────────────────────────────────────────────────────
export const BulkTimetableImportBody = t.Object({
  csv: t.String(),
});

export const BulkTimetableImportPreviewResponse = t.Object({
  parsed: t.Array(t.Any()),
  validCount: t.Number(),
  invalidCount: t.Number(),
});

export const BulkTimetableImportConfirmBody = t.Object({
  rows: t.Array(t.Any()),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type CreateTimetableEntryType = typeof CreateTimetableEntryBody.static;
export type UpdateTimetableEntryType = typeof UpdateTimetableEntryBody.static;
export type BulkTimetableImportType = typeof BulkTimetableImportBody.static;
export type BulkTimetableImportConfirmType = typeof BulkTimetableImportConfirmBody.static;
