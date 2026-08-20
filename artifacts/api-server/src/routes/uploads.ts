import { Router } from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = Router();

// POST /uploads - accepts raw binary via content-type, or base64 JSON body
// Stores file and returns { url, fileName }
router.post("/uploads", async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const contentType = req.headers["content-type"] || "application/octet-stream";
    const originalName = (req.headers["x-file-name"] as string) || "upload";
    const ext = path.extname(originalName) || ".bin";
    const fileName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Collect body chunks (raw binary upload)
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, buffer);

      const url = `/api/uploads/${fileName}`;
      res.status(201).json({ url, fileName: originalName });
    });
    req.on("error", () => {
      res.status(500).json({ error: "Upload failed" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /uploads/:fileName - serve uploaded files
router.get("/uploads/:fileName", (req, res): void => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
