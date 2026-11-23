import fs from "node:fs/promises";
import JSZip from "jszip";
import { scanValue } from "./signatures.js";

const PROPERTY_PARTS = ["docProps/app.xml", "docProps/core.xml", "docProps/custom.xml"];
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
];
// Fields that hold people's names; we show them but don't match AI names in them.
const PERSON_FIELDS = ["creator", "lastModifiedBy", "Manager"];

// Works for .docx, .xlsx and .pptx (all Office Open XML zip packages).
export async function inspectOffice(filePath) {
  const fields = {};
  const signals = [];
  const notes = [];
  const zip = await JSZip.loadAsync(await fs.readFile(filePath));

  for (const part of PROPERTY_PARTS) {
    const entry = zip.file(part);
    if (!entry) continue;
    const xml = await entry.async("string");
    for (const tag of TAGS) {
      const re = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>([^<]*)</(?:[\\w]+:)?${tag}>`);
      const m = xml.match(re);
      if (m && m[1].trim() && fields[tag] === undefined) fields[tag] = m[1].trim();
    }
    // Custom properties can hold arbitrary labels, so scan that part whole.
    if (part.endsWith("custom.xml")) signals.push(...scanValue(`office:${part}`, xml));
  }

  signals.push(...scanValue("office:properties", fields, "", [], PERSON_FIELDS));

  if (fields.created) {
    const d = new Date(fields.created);
    if (!Number.isNaN(d.getTime())) fields.createdAt = d.toISOString();
    delete fields.created;
  }
  if (fields.modified) {
    const d = new Date(fields.modified);
    if (!Number.isNaN(d.getTime())) fields.modifiedAt = d.toISOString();
    delete fields.modified;
  }

  if (Object.keys(fields).length === 0) notes.push("no document properties found");
  return { fields, signals, notes, provenance: null };
}
