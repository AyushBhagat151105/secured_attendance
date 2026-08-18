import { Elysia } from "elysia";
import { requireRole } from "../../auth/guards";
import {
  CreateBuildingBody,
  CreateRoomBody,
  IdParam,
  UpdateBuildingBody,
  UpdateRoomBody,
} from "./model";
import { CampusService } from "./service";

export const adminCampusModule = new Elysia({ prefix: "/campus" })
  .use(requireRole(["admin", "super_admin"]))

  // ─── Buildings ────────────────────────────────────────────────────────────────
  .get("/buildings", async () => CampusService.listBuildings(), {
    detail: { tags: ["Admin - Campus"], summary: "List buildings" },
  })
  .post("/buildings", async ({ body }) => CampusService.createBuilding(body), {
    body: CreateBuildingBody,
    detail: { tags: ["Admin - Campus"], summary: "Create building" },
  })
  .get("/buildings/:id", async ({ params: { id } }) => CampusService.getBuilding(id), {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Get building" },
  })
  .patch("/buildings/:id", async ({ params: { id }, body }) => CampusService.updateBuilding(id, body), {
    params: IdParam,
    body: UpdateBuildingBody,
    detail: { tags: ["Admin - Campus"], summary: "Update building" },
  })
  .delete("/buildings/:id", async ({ params: { id } }) => CampusService.deleteBuilding(id), {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Delete building" },
  })

  // ─── Rooms ────────────────────────────────────────────────────────────────────
  .get("/rooms", async () => CampusService.listRooms(), {
    detail: { tags: ["Admin - Campus"], summary: "List rooms" },
  })
  .post("/rooms", async ({ body }) => CampusService.createRoom(body), {
    body: CreateRoomBody,
    detail: { tags: ["Admin - Campus"], summary: "Create room" },
  })
  .get("/rooms/:id", async ({ params: { id } }) => CampusService.getRoom(id), {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Get room" },
  })
  .patch("/rooms/:id", async ({ params: { id }, body }) => CampusService.updateRoom(id, body), {
    params: IdParam,
    body: UpdateRoomBody,
    detail: { tags: ["Admin - Campus"], summary: "Update room" },
  })
  .delete("/rooms/:id", async ({ params: { id } }) => CampusService.deleteRoom(id), {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Delete room" },
  });
