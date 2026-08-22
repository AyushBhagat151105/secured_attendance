import { t } from "elysia";

export const ScanAttendanceBody = t.Object({
  sessionId: t.String(),
  nonce: t.String(),
  signature: t.String(),
  expiresAt: t.Number(),
  gpsLat: t.Optional(t.Number()),
  gpsLng: t.Optional(t.Number()),
  deviceFingerprint: t.Optional(t.String()),
});

export type ScanAttendanceDto = typeof ScanAttendanceBody.static;

export const ScheduleSlot = t.Object({
  id: t.String(),
  dayOfWeek: t.Number(),
  startTime: t.String(), // "HH:MM"
  endTime: t.String(), // "HH:MM"
  subject: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
  }),
  room: t.Object({
    id: t.String(),
    name: t.String(),
  }),
  teacher: t.Object({
    id: t.String(),
    name: t.String(),
  }),
  activeSession: t.Optional(t.Object({
    id: t.String(),
    status: t.String(),
  })),
});

export const ScheduleResponse = t.Array(ScheduleSlot);

export const AttendanceHistoryItem = t.Object({
  id: t.String(),
  date: t.String(), // ISO string
  status: t.String(), // "PRESENT", "ABSENT", "LATE"
  session: t.Object({
    id: t.String(),
    subject: t.Object({
      name: t.String(),
      code: t.String(),
    }),
    room: t.Object({
      name: t.String(),
    }),
  }),
});

export const HistoryResponse = t.Object({
  items: t.Array(AttendanceHistoryItem),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
});

export const AttendanceStats = t.Object({
  streak: t.Number(),
  overallPercentage: t.Number(),
  bySubject: t.Array(t.Object({
    subjectId: t.String(),
    subjectName: t.String(),
    percentage: t.Number(),
    attended: t.Number(),
    total: t.Number(),
  })),
});

export const StudentProfileResponse = t.Object({
  id: t.String(),
  enrollmentNo: t.String(),
  programCode: t.String(),
  admissionYear: t.Number(),
  rollNumber: t.String(),
  status: t.String(),
  deviceBound: t.Boolean(),
  deviceId: t.Union([t.String(), t.Null()]),
  deviceModel: t.Union([t.String(), t.Null()]),
});
