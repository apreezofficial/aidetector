import { identifyTool } from "./signatures.js";

// The short answer shown at the top: status, which AI (and company), which
// model, and when it was made. Any part we can't find is null.
export function buildSummary(report, provenance) {
  const p = provenance ?? {};
  let tool = p.tool ?? null;
  let provider = p.provider ?? null;

  // No C2PA? Fall back to the first matched signal that names a tool or company.
  if (!tool && !provider) {
    for (const s of report.signals) {
      const id = identifyTool(s.match);
      if (id && (id.tool || id.provider)) {
        tool = id.tool;
        provider = id.provider;
        break;
      }
    }
  }

  let status;
  let tone;
  switch (report.verdict) {
    case "ai-signature-found":
      status = p.aiLevel === "edited" ? "Edited with AI" : p.aiLevel === "generated" ? "Made with AI" : "AI tool signature found";
      tone = "found";
      break;
    case "no-ai-signature-found":
      status = "No AI signature found";
      tone = "clear";
      break;
    case "no-metadata-to-check":
      status = "This file type has no metadata to check";
      tone = "";
      break;
    case "unsupported":
      status = "Unsupported file type";
      tone = "error";
      break;
    default:
      status = "Couldn't read this file";
      tone = "error";
  }

  const found = report.verdict === "ai-signature-found";
  return {
    status,
    tone,
    tool: found ? tool : null,
    provider: found ? provider : null,
    model: found ? p.model ?? null : null,
    createdAt: found ? p.createdAt ?? report.fields.createdAt ?? null : null,
  };
}
