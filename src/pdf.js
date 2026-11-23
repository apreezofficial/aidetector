import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { scanValue } from "./signatures.js";

export async function inspectPdf(filePath) {
  const fields = {};
  const notes = [];
  const bytes = await fs.readFile(filePath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });

  const values = {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
  };
  for (const [k, v] of Object.entries(values)) {
    if (v) fields[k] = v;
  }
  const created = doc.getCreationDate();
  if (created && !Number.isNaN(created.getTime())) fields.createdAt = created.toISOString();
  if (Object.keys(fields).length === 0) notes.push("no document info dictionary found");

  // The author field holds a person's name, so it isn't matched.
  const signals = scanValue("pdf-info", values, "", [], ["author"]);
  return { fields, signals, notes };
}
