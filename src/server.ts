import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import express, { type Express } from "express";
import multer from "multer";
import { inspectFile } from "./index.js";

// Vercel functions reject request bodies over about 4.5 MB, so cap uploads lower there.
export const MAX_BYTES = (process.env.VERCEL ? 4 : 25) * 1024 * 1024;
const MAX_MB = MAX_BYTES / 1024 / 1024;

const ALLOWED_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".heic", ".heif", ".tif", ".tiff",
  ".docx", ".xlsx", ".pptx", ".pdf", ".txt", ".md", ".csv",
]);

type HttpError = Error & { status?: number; code?: string };

// The home page, read once at startup. On Vercel the function (not the CDN) can
// receive requests for "/", and its bundle only contains files that the build's
// file tracer can see. `new URL("...", import.meta.url)` is the form it follows,
// so this also ships public/index.html inside the function.
const indexHtml: Buffer | null = await fs.readFile(new URL("../public/index.html", import.meta.url)).catch(() => null);

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
      const err: HttpError = Object.assign(new Error(`File type ${ext || "(none)"} is not supported`), { status: 415 });
      cb(err);
      return;
    }
    cb(null, true);
  },
});

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/", async (_req, res, next) => {
    // On Vercel, use the copy read at startup. Anywhere else, re-read the file so
    // edits to the page show without restarting the server.
    const html = process.env.VERCEL
      ? indexHtml
      : await fs.readFile(new URL("../public/index.html", import.meta.url)).catch(() => indexHtml);
    if (!html) {
      next(); // falls through to express.static below
      return;
    }
    res.type("html").send(html);
  });

  // public/ sits next to src/ (and next to dist/), so ".." works for both.
  app.use(express.static(path.join(import.meta.dirname, "..", "public")));

  // Lets the page show the real upload limit for wherever it is hosted.
  app.get("/api/limits", (_req, res) => {
    res.json({ maxMb: MAX_MB });
  });

  app.post("/api/inspect", (req, res) => {
    upload.single("file")(req, res, async (err: unknown) => {
      if (err) {
        const e = err as HttpError;
        const tooBig = e.code === "LIMIT_FILE_SIZE";
        res.status(tooBig ? 413 : e.status ?? 400).json({ error: tooBig ? `File is larger than ${MAX_MB} MB` : e.message });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      try {
        const report = await inspectFile(file.path);
        // Show the user's original name, not the temp name.
        report.file = file.originalname;
        res.json(report);
      } catch (e) {
        res.status(500).json({ error: `Could not inspect file: ${e instanceof Error ? e.message : String(e)}` });
      } finally {
        fs.rm(file.path, { force: true }).catch(() => {});
      }
    });
  });

  return app;
}

// Hosts like Vercel import the app from this default export.
const app = createApp();
export default app;

// Start listening when run directly (npm start / npm run dev), not when imported.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "127.0.0.1", () => {
    console.log(`AI provenance check running at http://localhost:${port}`);
  });
}
