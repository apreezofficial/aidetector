import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import express from "express";
import multer from "multer";
import { inspectFile } from "./src/index.js";

export const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff",
  ".docx", ".xlsx", ".pptx", ".pdf", ".txt", ".md", ".csv",
]);

// Uploads are written to a private temp folder, inspected, then deleted.
const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "aidetect-upload-"));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(Object.assign(new Error(`File type ${ext || "(none)"} is not supported`), { status: 415 }));
    }
    cb(null, true);
  },
});

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(express.static(path.join(import.meta.dirname, "public")));

  app.post("/api/inspect", (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.status || 400;
        return res.status(status).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is larger than 25 MB" : err.message });
      }
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      try {
        const report = await inspectFile(req.file.path);
        // Show the user's original name, not the temp name.
        report.file = req.file.originalname;
        res.json(report);
      } catch (e) {
        res.status(500).json({ error: `Could not inspect file: ${e.message}` });
      } finally {
        fs.rm(req.file.path, { force: true }).catch(() => {});
      }
    });
  });

  return app;
}

// Start the server when run directly (npm start), not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, "127.0.0.1", () => {
    console.log(`AI provenance check running at http://localhost:${port}`);
  });
}
