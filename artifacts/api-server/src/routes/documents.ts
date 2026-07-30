import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, documentsTable, tenantsTable } from "@workspace/db";
import {
  ListDocumentsQueryParams,
  CreateDocumentBody,
  DeleteDocumentParams,
  ListDocumentsResponse,
  CreateDocumentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichDocument(doc: typeof documentsTable.$inferSelect) {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, doc.tenantId));
  return {
    ...doc,
    tenantName: tenant?.fullName ?? "Unknown",
    createdAt: doc.createdAt.toISOString(),
  };
}

// GET /documents
router.get("/documents", async (req, res): Promise<void> => {
  const query = ListDocumentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let docs = await db.select().from(documentsTable).orderBy(documentsTable.createdAt);

  if (query.data.tenantId != null) {
    docs = docs.filter((d) => d.tenantId === query.data.tenantId);
  }

  const enriched = await Promise.all(docs.map(enrichDocument));
  res.json(ListDocumentsResponse.parse(enriched));
});

// POST /documents
router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [doc] = await db.insert(documentsTable).values(parsed.data).returning();
  res.status(201).json(CreateDocumentResponse.parse(await enrichDocument(doc)));
});

// DELETE /documents/:id
router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
