import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable, tenantsTable, roomsTable } from "@workspace/db";
import {
  ListPaymentsQueryParams,
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  DeletePaymentParams,
  ListPaymentsResponse,
  CreatePaymentResponse,
  GetPaymentResponse,
  UpdatePaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, payment.tenantId));
  const [room] = tenant ? await db.select().from(roomsTable).where(eq(roomsTable.id, tenant.roomId)) : [undefined];
  return {
    ...payment,
    tenantName: tenant?.fullName ?? "Unknown",
    roomId: tenant?.roomId ?? 0,
    roomName: room?.name ?? "Unknown",
    createdAt: payment.createdAt.toISOString(),
  };
}

// GET /payments
router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);

  if (query.data.tenantId != null) {
    payments = payments.filter((p) => p.tenantId === query.data.tenantId);
  }

  const enriched = await Promise.all(payments.map(enrichPayment));
  res.json(ListPaymentsResponse.parse(enriched));
});

// POST /payments
router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db.insert(paymentsTable).values(parsed.data).returning();
  res.status(201).json(CreatePaymentResponse.parse(await enrichPayment(payment)));
});

// GET /payments/:id
router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(GetPaymentResponse.parse(await enrichPayment(payment)));
});

// PATCH /payments/:id
router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db
    .update(paymentsTable)
    .set(parsed.data)
    .where(eq(paymentsTable.id, params.data.id))
    .returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(UpdatePaymentResponse.parse(await enrichPayment(payment)));
});

// DELETE /payments/:id
router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
