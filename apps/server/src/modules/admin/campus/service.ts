import prisma from "@secured_attendance/db";
import { status } from "elysia";
import type {
  CreateBuildingType,
  CreateRoomType,
  UpdateBuildingType,
  UpdateRoomType,
} from "./model";

export class CampusService {
  // ─── Buildings ────────────────────────────────────────────────────────────────
  static async listBuildings() {
    return prisma.building.findMany({ orderBy: { name: "asc" } });
  }

  static async getBuilding(id: string) {
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) return status(404, { message: "Building not found" });
    return building;
  }

  static async createBuilding(data: CreateBuildingType) {
    return prisma.building.create({ data });
  }

  static async updateBuilding(id: string, data: UpdateBuildingType) {
    return prisma.building.update({ where: { id }, data });
  }

  static async deleteBuilding(id: string) {
    await prisma.building.delete({ where: { id } });
    return { success: true };
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────────
  static async listRooms() {
    return prisma.room.findMany({
      include: { building: true },
      orderBy: { name: "asc" },
    });
  }

  static async getRoom(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { building: true },
    });
    if (!room) return status(404, { message: "Room not found" });
    return room;
  }

  static async createRoom(data: CreateRoomType) {
    return prisma.room.create({
      data: {
        ...data,
        bssidWhitelist: data.bssidWhitelist ?? [],
      },
    });
  }

  static async updateRoom(id: string, data: UpdateRoomType) {
    return prisma.room.update({ where: { id }, data });
  }

  static async deleteRoom(id: string) {
    await prisma.room.delete({ where: { id } });
    return { success: true };
  }
}
