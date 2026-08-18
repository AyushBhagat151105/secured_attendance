import { t } from "elysia";
import { IdParam } from "../academic/model";

// ─── Shared Models ────────────────────────────────────────────────────────────
export { IdParam };

// ─── Building Models ──────────────────────────────────────────────────────────
export const BuildingModel = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  gpsLat: t.Number(),
  gpsLng: t.Number(),
  radiusMeters: t.Number(),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateBuildingBody = t.Object({
  name: t.String({ minLength: 2 }),
  code: t.String({ minLength: 2 }),
  gpsLat: t.Number(),
  gpsLng: t.Number(),
  radiusMeters: t.Optional(t.Number({ minimum: 1 })),
});

export const UpdateBuildingBody = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  code: t.Optional(t.String({ minLength: 2 })),
  gpsLat: t.Optional(t.Number()),
  gpsLng: t.Optional(t.Number()),
  radiusMeters: t.Optional(t.Number({ minimum: 1 })),
});

// ─── Room Models ──────────────────────────────────────────────────────────────
export const RoomModel = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  buildingId: t.String(),
  floor: t.Union([t.Number(), t.Null()]),
  capacity: t.Union([t.Number(), t.Null()]),
  bssidWhitelist: t.Array(t.String()),
  beaconUuid: t.Union([t.String(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});

export const CreateRoomBody = t.Object({
  name: t.String({ minLength: 1 }),
  type: t.String({ minLength: 2 }),
  buildingId: t.String(),
  floor: t.Optional(t.Number()),
  capacity: t.Optional(t.Number({ minimum: 1 })),
  bssidWhitelist: t.Optional(t.Array(t.String())),
  beaconUuid: t.Optional(t.String()),
});

export const UpdateRoomBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  type: t.Optional(t.String({ minLength: 2 })),
  buildingId: t.Optional(t.String()),
  floor: t.Optional(t.Number()),
  capacity: t.Optional(t.Number({ minimum: 1 })),
  bssidWhitelist: t.Optional(t.Array(t.String())),
  beaconUuid: t.Optional(t.String()),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type CreateBuildingType = typeof CreateBuildingBody.static;
export type UpdateBuildingType = typeof UpdateBuildingBody.static;
export type CreateRoomType = typeof CreateRoomBody.static;
export type UpdateRoomType = typeof UpdateRoomBody.static;
