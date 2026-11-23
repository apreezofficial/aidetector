import fs from "node:fs/promises";
import exifr from "exifr";
import { scanValue } from "./signatures.js";
import { inspectC2pa } from "./c2pa.js";

// Reads PNG text chunks (tEXt / iTXt). ChatGPT-style tools and Stable
// Diffusion UIs often store generation parameters here.
export function pngTextChunks(buf) {
  const out = [];
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return out;
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "tEXt") {
      const i = data.indexOf(0);
      if (i >= 0) out.push({ key: data.toString("latin1", 0, i), value: data.toString("latin1", i + 1) });
    } else if (type === "iTXt") {
      const i = data.indexOf(0);
      if (i >= 0) {
        const compressed = data[i + 1] === 1;
        let p = i + 3; // skip compression flag + method
        const langEnd = data.indexOf(0, p);
        if (langEnd >= 0) {
          const transEnd = data.indexOf(0, langEnd + 1);
          if (transEnd >= 0 && !compressed) {
            out.push({ key: data.toString("utf8", 0, i), value: data.toString("utf8", transEnd + 1) });
          }
        }
      }
    }
    if (type === "IEND") break;
    off += 12 + len;
  }
  return out;
}

export async function inspectImage(filePath, mimeType) {
  const signals = [];
  const fields = {};
  const notes = [];

  // EXIF / XMP / IPTC via exifr (covers JPEG, PNG-XMP, WebP, AVIF, TIFF).
  try {
    const bytes = await fs.readFile(filePath);
    const meta = await exifr.parse(bytes, { tiff: true, exif: true, xmp: true, iptc: true });
    if (meta) {
      for (const key of ["Software", "CreatorTool", "Make", "Model", "DigitalSourceType"]) {
        if (meta[key] !== undefined) fields[key] = String(meta[key]);
      }
      const created = meta.DateTimeOriginal ?? meta.CreateDate ?? meta.CreationDate;
      if (created instanceof Date && !Number.isNaN(created.getTime())) {
        fields.createdAt = created.toISOString();
      }
      signals.push(...scanValue("exif/xmp/iptc", meta));
    }
  } catch (err) {
    notes.push(`EXIF/XMP/IPTC read failed: ${err.message}`);
  }

  // PNG text chunks.
  if (mimeType === "image/png") {
    try {
      const buf = await fs.readFile(filePath);
      const chunks = pngTextChunks(buf);
      if (chunks.length) fields.pngTextKeys = chunks.map((c) => c.key);
      for (const c of chunks) {
        signals.push(...scanValue("png-text", { [c.key]: c.value }));
      }
    } catch (err) {
      notes.push(`PNG text read failed: ${err.message}`);
    }
  }

  // C2PA Content Credentials.
  const c2pa = await inspectC2pa(filePath, mimeType);
  Object.assign(fields, c2pa.fields);
  signals.push(...c2pa.signals);
  notes.push(...c2pa.notes);

  return { signals, fields, notes, provenance: c2pa.provenance };
}
