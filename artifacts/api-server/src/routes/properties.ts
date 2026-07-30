import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, propertiesTable, roomsTable, tenantsTable } from "@workspace/db";
import {
  CreatePropertyBody,
  UpdatePropertyBody,
  GetPropertyParams,
  UpdatePropertyParams,
  DeletePropertyParams,
  ListPropertiesResponse,
  CreatePropertyResponse,
  GetPropertyResponse,
  UpdatePropertyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /properties
router.get("/properties", async (req, res): Promise<void> => {
  const properties = await db.select().from(propertiesTable).orderBy(propertiesTable.createdAt);

  const result = await Promise.all(
    properties.map(async (p) => {
      const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, p.id));
      const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
      const expectedRent = rooms.reduce((sum, r) => sum + r.monthlyRent, 0);
      return {
        ...p,
        totalRooms: rooms.length,
        occupiedRooms,
        expectedRent,
        createdAt: p.createdAt.toISOString(),
      };
    })
  );

  res.json(ListPropertiesResponse.parse(result));
});

// POST /properties
router.post("/properties", async (req, res): Promise<void> => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [property] = await db.insert(propertiesTable).values(parsed.data).returning();
  res.status(201).json(
    CreatePropertyResponse.parse({
      ...property,
      totalRooms: 0,
      occupiedRooms: 0,
      expectedRent: 0,
      createdAt: property.createdAt.toISOString(),
    })
  );
});

// GET /properties/:id
router.get("/properties/:id", async (req, res): Promise<void> => {
  const params = GetPropertyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, params.data.id));
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, property.id));
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const expectedRent = rooms.reduce((sum, r) => sum + r.monthlyRent, 0);

  // Enrich rooms with tenant names
  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      let tenantId: number | null = null;
      let tenantName: string | null = null;
      if (room.status === "occupied") {
        const [tenant] = await db
          .select()
          .from(tenantsTable)
          .where(eq(tenantsTable.roomId, room.id));
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
    })
  );

  res.json(
    GetPropertyResponse.parse({
      ...property,
      totalRooms: rooms.length,
      occupiedRooms,
      expectedRent,
      createdAt: property.createdAt.toISOString(),
      rooms: enrichedRooms,
    })
  );
});

// PATCH /properties/:id
router.patch("/properties/:id", async (req, res): Promise<void> => {
  const params = UpdatePropertyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [property] = await db
    .update(propertiesTable)
    .set(parsed.data)
    .where(eq(propertiesTable.id, params.data.id))
    .returning();
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const rooms = await db.select().from(roomsTable).where(eq(roomsTable.propertyId, property.id));
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const expectedRent = rooms.reduce((sum, r) => sum + r.monthlyRent, 0);

  res.json(
    UpdatePropertyResponse.parse({
      ...property,
      totalRooms: rooms.length,
      occupiedRooms,
      expectedRent,
      createdAt: property.createdAt.toISOString(),
    })
  );
});

// DELETE /properties/:id
router.delete("/properties/:id", async (req, res): Promise<void> => {
  const params = DeletePropertyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [property] = await db.delete(propertiesTable).where(eq(propertiesTable.id, params.data.id)).returning();
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
