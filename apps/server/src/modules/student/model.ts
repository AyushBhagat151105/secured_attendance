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
