import { Elysia, status } from "elysia";
import prisma from "@secured_attendance/db";
import { requireRole } from "../middlewares/guards";
import {
  CreateBuildingBody,
  CreateRoomBody,
  IdParam,
  UpdateBuildingBody,
  UpdateRoomBody,
} from "../models/admin-campus.model";

export const adminCampusModule = new Elysia({ prefix: "/campus" })
  .use(requireRole(["admin", "super_admin"]))

  .get("/buildings", async () => {
    return prisma.building.findMany({ orderBy: { name: "asc" } });
  }, {
    detail: { tags: ["Admin - Campus"], summary: "List buildings" },
  })
  .post("/buildings", async ({ body }) => {
    return prisma.building.create({ data: body });
  }, {
    body: CreateBuildingBody,
    detail: { tags: ["Admin - Campus"], summary: "Create building" },
  })
  .get("/buildings/:id", async ({ params: { id } }) => {
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) return status(404, { message: "Building not found" });
    return building;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Get building" },
  })
  .patch(
    "/buildings/:id",
    async ({ params: { id }, body }) => {
      return prisma.building.update({ where: { id }, data: body });
    },
    {
      params: IdParam,
      body: UpdateBuildingBody,
      detail: { tags: ["Admin - Campus"], summary: "Update building" },
    },
  )
  .delete("/buildings/:id", async ({ params: { id } }) => {
    await prisma.building.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Delete building" },
  })

  .get("/rooms", async () => {
    return prisma.room.findMany({
      include: { building: true },
      orderBy: { name: "asc" },
    });
  }, {
    detail: { tags: ["Admin - Campus"], summary: "List rooms" },
  })
  .post("/rooms", async ({ body }) => {
    return prisma.room.create({
      data: {
        ...body,
        bssidWhitelist: body.bssidWhitelist ?? [],
      },
    });
  }, {
    body: CreateRoomBody,
    detail: { tags: ["Admin - Campus"], summary: "Create room" },
  })
  .get("/rooms/:id", async ({ params: { id } }) => {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });
    if (!room) return status(404, { message: "Room not found" });
    return room;
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Get room" },
  })
  .patch("/rooms/:id", async ({ params: { id }, body }) => {
    return prisma.room.update({ where: { id }, data: body });
  }, {
    params: IdParam,
    body: UpdateRoomBody,
    detail: { tags: ["Admin - Campus"], summary: "Update room" },
  })
  .delete("/rooms/:id", async ({ params: { id } }) => {
    await prisma.room.delete({ where: { id } });
    return { success: true };
  }, {
    params: IdParam,
    detail: { tags: ["Admin - Campus"], summary: "Delete room" },
  });
