import { t } from "elysia";

export const CreateSessionBody = t.Object({
  timetableEntryId: t.String({ description: "ID of the timetable entry for today" }),
});

export type CreateSessionType = typeof CreateSessionBody.static;

// Future: Close session body if needed, currently just an empty POST to /close
