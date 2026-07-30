import { Router, type IRouter } from "express";
import { ilike, or, eq } from "drizzle-orm";
import { db, propertiesTable, roomsTable, tenantsTable } from "@workspace/db";
import { GlobalSearchQueryParams, GlobalSearchResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /search?q=...
router.get("/search", async (req, res): Promise<void> => {
  const query = GlobalSearchQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const q = `%${query.data.q}%`;

  const [matchedProperties, matchedRooms, matchedTenants] = await Promise.all([
    db
      .select()
      .from(propertiesTable)
      .where(
        or(
          ilike(propertiesTable.name, q),
          ilike(propertiesTable.address, q),
          ilike(propertiesTable.city, q),
          ilike(propertiesTable.postcode, q)
        )
      ),
    db
      .select()
      .from(roomsTable)
      .where(or(ilike(roomsTable.name, q), ilike(roomsTable.keyTag, q))),
    db
      .select()
      .from(tenantsTable)
      .where(
        or(ilike(tenantsTable.fullName, q), ilike(tenantsTable.email, q), ilike(tenantsTable.phone, q))
      ),
  ]);

  // Enrich rooms with stats
  const allRooms = await db.select().from(roomsTable);
  const enrichedProperties = await Promise.all(
    matchedProperties.map(async (p) => {
      const rooms = allRooms.filter((r) => r.propertyId === p.id);
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

  // Enrich rooms with tenant info
  const allTenants = await db.select().from(tenantsTable);
  const enrichedRooms = matchedRooms.map((room) => {
    const tenant = allTenants.find((t) => t.roomId === room.id && t.status === "active");
    return {
      ...room,
      tenantId: tenant?.id ?? null,
      tenantName: tenant?.fullName ?? null,
      createdAt: room.createdAt.toISOString(),
    };
  });

  // Enrich tenants
  const allProperties = await db.select().from(propertiesTable);
  const enrichedTenants = await Promise.all(
    matchedTenants.map(async (tenant) => {
      const room = allRooms.find((r) => r.id === tenant.roomId);
      const property = room ? allProperties.find((p) => p.id === room.propertyId) : undefined;
      return {
        ...tenant,
        propertyName: property?.name ?? "N/A",
        roomName: room?.name ?? "N/A",
        monthlyRent: room?.monthlyRent ?? 0,
        createdAt: tenant.createdAt.toISOString(),
      };
    })
  );

  res.json(
    GlobalSearchResponse.parse({
      properties: enrichedProperties,
      rooms: enrichedRooms,
      tenants: enrichedTenants,
    })
  );
});

export default router;
