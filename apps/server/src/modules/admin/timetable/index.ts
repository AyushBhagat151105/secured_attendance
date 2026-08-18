import { Elysia } from "elysia";
import { requireRole } from "../../auth/guards";
import {
  BulkTimetableImportBody,
  BulkTimetableImportConfirmBody,
  CreateTimetableEntryBody,
  IdParam,
  UpdateTimetableEntryBody,
} from "./model";
import { TimetableService } from "./service";

export const adminTimetableModule = new Elysia({ prefix: "/timetable" })
  .use(requireRole(["admin", "super_admin"]))

  // ─── Timetable Entries ────────────────────────────────────────────────────────
  .get("/entries", async () => TimetableService.listTimetableEntries(), {
    detail: { tags: ["Admin - Timetable"], summary: "List timetable entries" },
  })
  .post("/entries", async ({ body }) => TimetableService.createTimetableEntry(body), {
    body: CreateTimetableEntryBody,
    detail: { tags: ["Admin - Timetable"], summary: "Create timetable entry" },
  })
  .get("/entries/:id", async ({ params: { id } }) => TimetableService.getTimetableEntry(id), {
    params: IdParam,
    detail: { tags: ["Admin - Timetable"], summary: "Get timetable entry" },
  })
  .patch("/entries/:id", async ({ params: { id }, body }) => TimetableService.updateTimetableEntry(id, body), {
    params: IdParam,
    body: UpdateTimetableEntryBody,
    detail: { tags: ["Admin - Timetable"], summary: "Update timetable entry" },
  })
  .delete("/entries/:id", async ({ params: { id } }) => TimetableService.deleteTimetableEntry(id), {
    params: IdParam,
    detail: { tags: ["Admin - Timetable"], summary: "Delete timetable entry" },
  })

  // ─── Bulk Import ──────────────────────────────────────────────────────────────
  .post("/entries/import/preview", async ({ body }) => TimetableService.previewImport(body), {
    body: BulkTimetableImportBody,
    detail: { tags: ["Admin - Timetable"], summary: "Preview timetable CSV import" },
  })
  .post("/entries/import/confirm", async ({ body }) => TimetableService.confirmImport(body), {
    body: BulkTimetableImportConfirmBody,
    detail: { tags: ["Admin - Timetable"], summary: "Confirm timetable CSV import" },
  });
