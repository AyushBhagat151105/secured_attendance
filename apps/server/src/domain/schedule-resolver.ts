export interface AcademicDateInfo {
  dayOfWeek: number;
  todayStart: Date;
  referenceDate: Date;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  roomId?: string | null;
  startTime: string;
  endTime?: string;
}

export interface SessionCandidate {
  id: string;
  timetableEntryId?: string | null;
  subjectId: string;
  roomId?: string | null;
  status: string;
  createdAt: Date;
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export class ScheduleResolver {
  static getAcademicDate(date: Date = new Date()): AcademicDateInfo {
    const istTime = new Date(date.getTime() + IST_OFFSET_MS);
    const dayOfWeek = istTime.getUTCDay();

    const year = istTime.getUTCFullYear();
    const month = istTime.getUTCMonth();
    const dayDate = istTime.getUTCDate();

    const todayStart = new Date(Date.UTC(year, month, dayDate, 0, 0, 0, 0) - IST_OFFSET_MS);

    return {
      dayOfWeek,
      todayStart,
      referenceDate: date,
    };
  }

  static matchSlotToSession<T extends SessionCandidate>(
    slot: TimetableSlot,
    candidates: T[],
    statusFilter?: "active" | "closed",
  ): T | null {
    const directMatch = candidates.find(
      (s) => s.timetableEntryId === slot.id && (!statusFilter || s.status === statusFilter),
    );

    if (directMatch) {
      return directMatch;
    }

    const [slotHour = 0, slotMin = 0] = slot.startTime.split(":").map(Number);
    const slotMins = slotHour * 60 + slotMin;

    const proximityMatch = candidates.find((s) => {
      if (statusFilter && s.status !== statusFilter) {
        return false;
      }

      if (s.subjectId !== slot.subjectId) {
        return false;
      }

      if (slot.roomId && s.roomId && s.roomId !== slot.roomId) {
        return false;
      }

      if (s.timetableEntryId && s.timetableEntryId !== slot.id) {
        return false;
      }

      const sessionMins = s.createdAt.getHours() * 60 + s.createdAt.getMinutes();
      return Math.abs(sessionMins - slotMins) <= 45;
    });

    return proximityMatch ?? null;
  }

  static async autoCloseExpiredSessions(): Promise<number> {
    try {
      const { default: prisma } = await import("@secured_attendance/db");
      const result = await prisma.attendanceSession.updateMany({
        where: {
          status: "active",
          endTime: { lt: new Date() },
        },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  }
}
