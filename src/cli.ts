#!/usr/bin/env node
import { inspectFile } from "./index.js";
import type { Report } from "./types.js";

const LABELS: Record<string, string> = {
  "ai-signature-found": "AI tool signature FOUND",
  "no-ai-signature-found": "No AI tool signature found",
  "no-metadata-to-check": "Nothing to check (no metadata format)",
  unsupported: "Unsupported file type",
  error: "Error reading file",
};

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("Usage: aidetect <file> [more files...] [--json]");
  process.exit(2);
}

const reports: Report[] = [];
for (const file of files) {
  reports.push(await inspectFile(file));
}

if (asJson) {
  console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
} else {
  for (const r of reports) {
    console.log(`\n${r.file}`);
    console.log(`  Result: ${LABELS[r.verdict] ?? r.verdict}`);
    const s = r.summary;
    if (s?.tool || s?.provider) {
      const who = s.tool && s.provider ? `${s.tool} (${s.provider})` : s.tool ?? s.provider;
      console.log(`  By: ${who} · Model ${s.model ?? "not stated"}`);
    }
    if (s?.createdAt) console.log(`  Created: ${s.createdAt}`);
    for (const sig of r.signals) {
      console.log(`  - matched "${sig.match}" in ${sig.source} at ${sig.field}`);
    }
    for (const [k, v] of Object.entries(r.fields)) {
      console.log(`  ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
    for (const n of r.notes) console.log(`  note: ${n}`);
  }
  console.log(`\n${reports[0]?.disclaimer ?? ""}`);
}
