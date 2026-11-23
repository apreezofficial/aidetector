import path from "node:path";
import { inspectImage } from "./image.js";
import { inspectOffice } from "./office.js";
import { inspectPdf } from "./pdf.js";
import { inspectC2pa } from "./c2pa.js";
import { buildSummary } from "./summary.js";
import type { Inspection, Provenance, Report, Signal } from "./types.js";

export type { Report, Summary, Signal, Verdict } from "./types.js";

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};
const OFFICE_EXTS = new Set([".docx", ".xlsx", ".pptx"]);
const TEXT_EXTS = new Set([".txt", ".md", ".csv"]);

export const DISCLAIMER =
  "Metadata is easy to remove or edit. No signature does not mean human-made, " +
  "and a signature shows a tool was used, not how much of the content it wrote.";

/**
 * Inspects one file and returns a structured report. Never throws for
 * unreadable files; errors are reported in `notes` and the verdict.
 */
export async function inspectFile(filePath: string): Promise<Report> {
  const ext = path.extname(filePath).toLowerCase();
  const report: Report = {
    file: filePath,
    kind: "unsupported",
    verdict: "unsupported",
    summary: null,
    signals: [],
    fields: {},
    notes: [],
    disclaimer: DISCLAIMER,
  };
  let provenance: Provenance | null = null;

  const take = (kind: Report["kind"], r: Inspection) => {
    report.kind = kind;
    report.signals = r.signals;
    report.fields = r.fields;
    report.notes = r.notes;
    provenance = r.provenance ?? null;
  };

  try {
    const imageType = IMAGE_TYPES[ext];
    if (imageType) {
      take("image", await inspectImage(filePath, imageType));
    } else if (OFFICE_EXTS.has(ext)) {
      take("office", await inspectOffice(filePath));
    } else if (ext === ".pdf") {
      const pdf = await inspectPdf(filePath);
      const c2pa = await inspectC2pa(filePath, "application/pdf");
      take("pdf", {
        signals: [...pdf.signals, ...c2pa.signals],
        fields: { ...pdf.fields, ...c2pa.fields },
        notes: [...pdf.notes, ...c2pa.notes],
        provenance: c2pa.provenance,
      });
    } else if (TEXT_EXTS.has(ext)) {
      report.kind = "text";
      report.notes.push("plain text has no metadata; this tool cannot check it");
      report.verdict = "no-metadata-to-check";
      report.summary = buildSummary(report, null);
      return report;
    } else {
      report.notes.push(`unsupported file type: ${ext || "(no extension)"}`);
      report.summary = buildSummary(report, null);
      return report;
    }
  } catch (err) {
    report.notes.push(`could not read file: ${err instanceof Error ? err.message : String(err)}`);
    report.verdict = "error";
    report.summary = buildSummary(report, null);
    return report;
  }

  // Collapse repeats of the same match from the same source.
  const grouped = new Map<string, Signal>();
  for (const s of report.signals) {
    const key = `${s.source}|${s.match}`;
    const existing = grouped.get(key);
    if (existing) existing.count = (existing.count ?? 1) + 1;
    else grouped.set(key, { ...s, count: 1 });
  }
  report.signals = [...grouped.values()];

  report.verdict = report.signals.length ? "ai-signature-found" : "no-ai-signature-found";
  report.summary = buildSummary(report, provenance);
  return report;
}
