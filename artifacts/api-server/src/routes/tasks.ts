import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

// GET /tasks?date=YYYY-MM-DD&category=...&month=YYYY-MM
router.get("/tasks", async (req, res) => {
  try {
    const { date, category, month } = req.query as Record<string, string>;

    let query = db.select().from(tasksTable).$dynamic();

    const conditions = [];

    if (date) {
      conditions.push(eq(tasksTable.date, date));
    }

    if (month) {
      // filter tasks in the given month YYYY-MM
      conditions.push(sql`${tasksTable.date} LIKE ${month + "-%"}`);
    }

    if (category) {
      conditions.push(eq(tasksTable.category, category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const tasks = await query.orderBy(tasksTable.date, tasksTable.createdAt);

    // Enrich with property/tenant names
    const enriched = await Promise.all(
      tasks.map(async (task) => {
        let propertyName: string | null = null;
        let propertyAddress: string | null = null;
        let tenantName: string | null = null;
        let tenantPhone: string | null = null;
        let monthlyRent: number | null = null;

        if (task.propertyId) {
          const prop = await db.query.propertiesTable.findFirst({
            where: (p, { eq }) => eq(p.id, task.propertyId!),
          });
          propertyName = prop?.name ?? null;
          propertyAddress = prop?.address ?? null;
        }

        if (task.tenantId) {
          const tenant = await db.query.tenantsTable.findFirst({
            where: (t, { eq }) => eq(t.id, task.tenantId!),
          });
          tenantName = tenant?.fullName ?? null;
          tenantPhone = tenant?.phone ?? null;

          if (tenant?.roomId) {
            const room = await db.query.roomsTable.findFirst({
              where: (r, { eq }) => eq(r.id, tenant.roomId!),
            });
            monthlyRent = room?.monthlyRent ?? null;
            if (!propertyName && room?.propertyId) {
              const prop = await db.query.propertiesTable.findFirst({
                where: (p, { eq }) => eq(p.id, room.propertyId),
              });
              propertyName = prop?.name ?? null;
              propertyAddress = prop?.address ?? null;
            }
          }
        }

        return {
          ...task,
          propertyName,
          propertyAddress,
          tenantName,
          tenantPhone,
          monthlyRent,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

// GET /tasks/:id
router.get("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to get task" });
  }
});

// POST /tasks
router.post("/tasks", async (req, res) => {
  try {
    const { title, description, category, date, status, propertyId, tenantId, notes } = req.body;
    const [task] = await db
      .insert(tasksTable)
      .values({
        title,
        description: description || null,
        category: category || "other",
        date,
        status: status || "pending",
        propertyId: propertyId ? Number(propertyId) : null,
        tenantId: tenantId ? Number(tenantId) : null,
        notes: notes || null,
      })
      .returning();
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PATCH /tasks/:id
router.patch("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const updates: Record<string, unknown> = {};
    const allowed = ["title", "description", "category", "date", "status", "propertyId", "tenantId", "notes"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key === "propertyId" ? "propertyId" : key === "tenantId" ? "tenantId" : key] = req.body[key];
      }
    }
    const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE /tasks/:id
router.delete("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, id)).returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
