import { describe, expect, it } from "bun:test";
import {
  ScheduleResolver,
  type TimetableSlot,
  type SessionCandidate,
} from "./schedule-resolver";

describe("ScheduleResolver — Deep Scheduling Domain Module", () => {
  describe("getAcademicDate", () => {
    it("converts UTC timestamps to Asia/Kolkata (IST) day-of-week", () => {
      // 2026-09-14 19:00:00 UTC is Monday in UTC, but 00:30:00 on Tuesday 2026-09-15 in IST
      const mondayNightUtc = new Date("2026-09-14T19:00:00Z");
      const info = ScheduleResolver.getAcademicDate(mondayNightUtc);

      // Tuesday = 2
      expect(info.dayOfWeek).toBe(2);
    });

    it("calculates midnight todayStart in local IST context", () => {
      const date = new Date("2026-09-14T10:00:00Z");
      const info = ScheduleResolver.getAcademicDate(date);

      expect(info.todayStart.getHours()).toBe(0);
      expect(info.todayStart.getMinutes()).toBe(0);
      expect(info.todayStart.getSeconds()).toBe(0);
    });
  });

  describe("matchSlotToSession", () => {
    const slot: TimetableSlot = {
      id: "slot-math-101",
      subjectId: "sub-math",
      roomId: "room-301",
      startTime: "10:00",
      endTime: "11:00",
    };

    it("matches directly by timetableEntryId regardless of creation time", () => {
      const candidates: SessionCandidate[] = [
        {
          id: "sess-1",
          timetableEntryId: "slot-math-101",
          subjectId: "sub-math",
          roomId: "room-301",
          status: "active",
          createdAt: new Date("2026-09-14T12:00:00Z"), // Different time
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match).not.toBeNull();
      expect(match?.id).toBe("sess-1");
    });

    it("respects statusFilter during direct match", () => {
      const candidates: SessionCandidate[] = [
        {
          id: "sess-1",
          timetableEntryId: "slot-math-101",
          subjectId: "sub-math",
          roomId: "room-301",
          status: "closed",
          createdAt: new Date(),
        },
      ];

      const activeMatch = ScheduleResolver.matchSlotToSession(slot, candidates, "active");
      expect(activeMatch).toBeNull();

      const closedMatch = ScheduleResolver.matchSlotToSession(slot, candidates, "closed");
      expect(closedMatch?.id).toBe("sess-1");
    });

    it("matches unlinked legacy session by time proximity within 45 minutes", () => {
      const sessionDate = new Date();
      sessionDate.setHours(10, 20, 0, 0); // 10:20 is within 20 mins of 10:00

      const candidates: SessionCandidate[] = [
        {
          id: "sess-legacy-1",
          timetableEntryId: null,
          subjectId: "sub-math",
          roomId: "room-301",
          status: "active",
          createdAt: sessionDate,
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match?.id).toBe("sess-legacy-1");
    });

    it("rejects unlinked session if time difference is greater than 45 minutes", () => {
      const sessionDate = new Date();
      sessionDate.setHours(11, 10, 0, 0); // 11:10 is 70 mins after 10:00

      const candidates: SessionCandidate[] = [
        {
          id: "sess-late",
          timetableEntryId: null,
          subjectId: "sub-math",
          roomId: "room-301",
          status: "active",
          createdAt: sessionDate,
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match).toBeNull();
    });

    it("rejects unlinked session if subjectId differs", () => {
      const sessionDate = new Date();
      sessionDate.setHours(10, 10, 0, 0);

      const candidates: SessionCandidate[] = [
        {
          id: "sess-diff-sub",
          timetableEntryId: null,
          subjectId: "sub-physics",
          roomId: "room-301",
          status: "active",
          createdAt: sessionDate,
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match).toBeNull();
    });

    it("rejects unlinked session if roomId differs", () => {
      const sessionDate = new Date();
      sessionDate.setHours(10, 10, 0, 0);

      const candidates: SessionCandidate[] = [
        {
          id: "sess-diff-room",
          timetableEntryId: null,
          subjectId: "sub-math",
          roomId: "room-999",
          status: "active",
          createdAt: sessionDate,
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match).toBeNull();
    });

    it("enforces anti-hijacking: session explicitly linked to another slot is never matched", () => {
      const sessionDate = new Date();
      sessionDate.setHours(10, 5, 0, 0);

      const candidates: SessionCandidate[] = [
        {
          id: "sess-other-slot",
          timetableEntryId: "slot-DIFFERENT-123", // Linked elsewhere!
          subjectId: "sub-math",
          roomId: "room-301",
          status: "active",
          createdAt: sessionDate,
        },
      ];

      const match = ScheduleResolver.matchSlotToSession(slot, candidates);
      expect(match).toBeNull();
    });
  });
});
