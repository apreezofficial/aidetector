import fs from "node:fs/promises";
import exifr from "exifr";
import { scanValue } from "./signatures.js";
import { inspectC2pa } from "./c2pa.js";
import { inspectOpenAiProvenance } from "./openai-provenance.js";
import type { Fields, Inspection, Signal } from "./types.js";

export interface PngTextChunk {
  key: string;
  value: string;
}

/**
 * Reads PNG text chunks (tEXt / iTXt). Stable Diffusion UIs and some other
 * tools store generation parameters here.
 */
export function pngTextChunks(buf: Buffer): PngTextChunk[] {
  const out: PngTextChunk[] = [];
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
        const langEnd = data.indexOf(0, i + 3); // skip compression flag + method
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

export interface WebpMetadata {
  /** Raw TIFF-formatted EXIF data, if the file has an EXIF chunk. */
  exif: Buffer | null;
  /** The XMP packet as text, if the file has an "XMP " chunk. */
  xmp: string | null;
}

/** Pulls the EXIF and XMP chunks out of a WebP (a RIFF container). */
export function webpMetadata(buf: Buffer): WebpMetadata {
  const out: WebpMetadata = { exif: null, xmp: null };
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return out;
  let off = 12;
  while (off + 8 <= buf.length) {
    const type = buf.toString("ascii", off, off + 4);
    const len = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "EXIF") {
      // Some writers prefix the TIFF data with "Exif\0\0", some don't.
      out.exif = data.subarray(0, 6).toString("latin1") === "Exif\0\0" ? data.subarray(6) : data;
    } else if (type === "XMP ") {
      out.xmp = data.toString("utf8");
    }
    off += 8 + len + (len % 2); // chunks are padded to an even length
  }
  return out;
}

/** Reads one value from an XMP packet, whether written as an attribute or an element. */
export function xmpValue(xml: string, name: string): string | undefined {
  const m = new RegExp(`${name}(?:="([^"]*)"|>([^<]*)<)`).exec(xml);
  const value = (m?.[1] ?? m?.[2])?.trim();
  return value || undefined;
}

export async function inspectImage(filePath: string, mimeType: string): Promise<Inspection> {
  const signals: Signal[] = [];
  const fields: Fields = {};
  const notes: string[] = [];

  const applyMeta = (meta: Record<string, unknown> | undefined): void => {
    if (!meta) return;
    for (const key of ["Software", "CreatorTool", "Make", "Model", "DigitalSourceType"]) {
      if (meta[key] !== undefined) fields[key] = String(meta[key]);
    }
    const created = meta.DateTimeOriginal ?? meta.CreateDate ?? meta.CreationDate;
    if (created instanceof Date && !Number.isNaN(created.getTime())) {
      fields.createdAt = created.toISOString();
    }
    signals.push(...scanValue("exif/xmp/iptc", meta));
  };

  // EXIF / XMP / IPTC. exifr covers JPEG, PNG, AVIF, TIFF and HEIC, but not WebP,
  // so WebP's own EXIF and XMP chunks are pulled out and read separately.
  try {
    const bytes = await fs.readFile(filePath);
    if (mimeType === "image/webp") {
      const { exif, xmp } = webpMetadata(bytes);
      if (exif) applyMeta(await exifr.parse(exif, { tiff: true, exif: true }));
      if (xmp) {
        const tool = xmpValue(xmp, "CreatorTool");
        const source = xmpValue(xmp, "DigitalSourceType");
        if (tool) fields.CreatorTool = tool;
        if (source) fields.DigitalSourceType = source;
        // The raw text is scanned too, so other AI markers in the packet are caught.
        signals.push(...scanValue("webp-xmp", { CreatorTool: tool, DigitalSourceType: source, xmp }));
      }
    } else {
      applyMeta(await exifr.parse(bytes, { tiff: true, exif: true, xmp: true, iptc: true }));
    }
  } catch (err) {
    notes.push(`EXIF/XMP/IPTC read failed: ${err instanceof Error ? err.message : String(err)}`);
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
      notes.push(`PNG text read failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // C2PA Content Credentials.
  const c2pa = await inspectC2pa(filePath, mimeType);
  Object.assign(fields, c2pa.fields);
  signals.push(...c2pa.signals);
  notes.push(...c2pa.notes);

  // Optional pixel-level watermark and OpenAI C2PA check. This sends supported
  // images to OpenAI only when the server owner has configured an API key.
  const openAi = await inspectOpenAiProvenance(filePath);
  Object.assign(fields, openAi.fields);
  signals.push(...openAi.signals);
  notes.push(...openAi.notes);

  return { signals, fields, notes, provenance: c2pa.provenance };
}
