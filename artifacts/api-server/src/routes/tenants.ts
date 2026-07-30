import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable, roomsTable, propertiesTable, paymentsTable, documentsTable } from "@workspace/db";
import {
  CreateTenantBody,
  UpdateTenantBody,
  GetTenantParams,
  UpdateTenantParams,
  DeleteTenantParams,
  ListTenantsResponse,
  CreateTenantResponse,
  GetTenantResponse,
  UpdateTenantResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichTenant(tenant: typeof tenantsTable.$inferSelect) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, tenant.roomId));
  let propertyName = "";
  let roomName = "";
  let monthlyRent = 0;
  if (room) {
    roomName = room.name;
    monthlyRent = room.monthlyRent;
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, room.propertyId));
    if (property) propertyName = property.name;
  }
  return {
    ...tenant,
    propertyName,
    roomName,
    monthlyRent,
    createdAt: tenant.createdAt.toISOString(),
  };
}

// GET /tenants
router.get("/tenants", async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
  const enriched = await Promise.all(tenants.map(enrichTenant));
  res.json(ListTenantsResponse.parse(enriched));
});

// POST /tenants
router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Mark room as occupied
  await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, parsed.data.roomId));

  const [tenant] = await db.insert(tenantsTable).values(parsed.data).returning();
  res.status(201).json(CreateTenantResponse.parse(await enrichTenant(tenant)));
});

// GET /tenants/:id
router.get("/tenants/:id", async (req, res): Promise<void> => {
  const params = GetTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const enriched = await enrichTenant(tenant);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.tenantId, tenant.id));
  const documents = await db.select().from(documentsTable).where(eq(documentsTable.tenantId, tenant.id));

  const enrichedPayments = payments.map((p) => ({
    ...p,
    tenantName: tenant.fullName,
    roomName: enriched.roomName,
    createdAt: p.createdAt.toISOString(),
  }));

  const enrichedDocs = documents.map((d) => ({
    ...d,
    tenantName: tenant.fullName,
    createdAt: d.createdAt.toISOString(),
  }));

  res.json(
    GetTenantResponse.parse({
      ...enriched,
      payments: enrichedPayments,
      documents: enrichedDocs,
    })
  );
});

// PATCH /tenants/:id
router.patch("/tenants/:id", async (req, res): Promise<void> => {
  const params = UpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // If room is changing, update old and new room status
  if (parsed.data.roomId && parsed.data.roomId !== existing.roomId) {
    await db.update(roomsTable).set({ status: "vacant" }).where(eq(roomsTable.id, existing.roomId));
    await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, parsed.data.roomId));
  }

  // If status is changing to inactive, free the room
  if (parsed.data.status === "inactive" && existing.status === "active") {
    await db.update(roomsTable).set({ status: "vacant" }).where(eq(roomsTable.id, existing.roomId));
  }

  const [tenant] = await db
    .update(tenantsTable)
    .set(parsed.data)
    .where(eq(tenantsTable.id, params.data.id))
    .returning();

  res.json(UpdateTenantResponse.parse(await enrichTenant(tenant)));
});

// DELETE /tenants/:id
router.delete("/tenants/:id", async (req, res): Promise<void> => {
  const params = DeleteTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // Free the room
  await db.update(roomsTable).set({ status: "vacant" }).where(eq(roomsTable.id, tenant.roomId));

  await db.delete(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
