import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, roomsTable, tenantsTable, propertiesTable } from "@workspace/db";
import {
  ListRoomsParams,
  CreateRoomParams,
  CreateRoomBody,
  GetRoomParams,
  UpdateRoomParams,
  UpdateRoomBody,
  DeleteRoomParams,
  ListRoomsResponse,
  CreateRoomResponse,
  GetRoomResponse,
  UpdateRoomResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper: enrich a room with tenant info
async function enrichRoom(room: typeof roomsTable.$inferSelect) {
  let tenantId: number | null = null;
  let tenantName: string | null = null;
  if (room.status === "occupied") {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.roomId, room.id));
    if (tenant) {
      tenantId = tenant.id;
      tenantName = tenant.fullName;
    }
  }
  return {
    ...room,
    tenantId,
    tenantName,
    createdAt: room.createdAt.toISOString(),
  };
}

// GET /properties/:propertyId/rooms
router.get("/properties/:propertyId/rooms", async (req, res): Promise<void> => {
  const params = ListRoomsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, params.data.propertyId));
  const enriched = await Promise.all(rooms.map(enrichRoom));
  res.json(ListRoomsResponse.parse(enriched));
});

// POST /properties/:propertyId/rooms
router.post("/properties/:propertyId/rooms", async (req, res): Promise<void> => {
  const params = CreateRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify property exists
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, params.data.propertyId));
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [room] = await db
    .insert(roomsTable)
    .values({ ...parsed.data, propertyId: params.data.propertyId })
    .returning();

  res.status(201).json(
    CreateRoomResponse.parse(await enrichRoom(room))
  );
});

// GET /rooms/:id
router.get("/rooms/:id", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(GetRoomResponse.parse(await enrichRoom(room)));
});

// PATCH /rooms/:id
router.patch("/rooms/:id", async (req, res): Promise<void> => {
  const params = UpdateRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db
    .update(roomsTable)
    .set(parsed.data)
    .where(eq(roomsTable.id, params.data.id))
    .returning();

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(UpdateRoomResponse.parse(await enrichRoom(room)));
});

// DELETE /rooms/:id
router.delete("/rooms/:id", async (req, res): Promise<void> => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.delete(roomsTable).where(eq(roomsTable.id, params.data.id)).returning();
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
