import fs from "node:fs/promises";
import JSZip from "jszip";
import { scanValue } from "./signatures.js";
import type { Fields, Inspection, Signal } from "./types.js";

const PROPERTY_PARTS = ["docProps/app.xml", "docProps/core.xml", "docProps/custom.xml"] as const;
const TAGS = [
  "Application",
  "AppVersion",
  "Company",
  "Template",
  "Manager",
  "creator",
  "lastModifiedBy",
  "title",
  "subject",
  "keywords",
  "description",
  "created",
  "modified",
] as const;
// Fields that hold people's names; we show them but don't match AI names in them.
const PERSON_FIELDS = ["creator", "lastModifiedBy", "Manager"];

function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Works for .docx, .xlsx and .pptx (all Office Open XML zip packages). */
export async function inspectOffice(filePath: string): Promise<Inspection> {
  const raw: Record<string, string> = {};
  const signals: Signal[] = [];
  const notes: string[] = [];
  const zip = await JSZip.loadAsync(await fs.readFile(filePath));

  for (const part of PROPERTY_PARTS) {
    const entry = zip.file(part);
    if (!entry) continue;
    const xml = await entry.async("string");
    for (const tag of TAGS) {
      const re = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>([^<]*)</(?:[\\w]+:)?${tag}>`);
      const m = xml.match(re);
      const text = m?.[1]?.trim();
      if (text && raw[tag] === undefined) raw[tag] = text;
    }
    // Custom properties can hold arbitrary labels, so scan that part whole.
    if (part.endsWith("custom.xml")) signals.push(...scanValue(`office:${part}`, xml));
  }

  signals.push(...scanValue("office:properties", raw, "", [], PERSON_FIELDS));

  const { created, modified, ...rest } = raw;
  const fields: Fields = { ...rest };
  const createdAt = toIso(created);
  const modifiedAt = toIso(modified);
  if (createdAt) fields.createdAt = createdAt;
  if (modifiedAt) fields.modifiedAt = modifiedAt;

  if (Object.keys(fields).length === 0) notes.push("no document properties found");
  return { fields, signals, notes, provenance: null };
}
