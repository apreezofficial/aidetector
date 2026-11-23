import { identifyTool } from "./signatures.js";
import type { Provenance, Report, Summary, Tone } from "./types.js";

// Notes written by src/c2pa.ts when the credentials could not be read.
const C2PA_UNCHECKED = /C2PA read failed|C2PA parse failed|\(C2PA\) could not be checked/;

/**
 * Why "nothing found" doesn't mean "not AI". Most of the time a missing signature is
 * because the tool never wrote one (documents) or the marker was lost (screenshots,
 * re-saves, messaging apps), not because the file is human-made.
 */
function caveatFor(report: Report): string | null {
  if (report.verdict !== "no-ai-signature-found") return null;
  if (report.kind === "image") {
    return "Screenshots, re-saved copies, and apps that strip metadata remove AI markers, so this can't rule AI out.";
  }
  if (report.kind === "pdf" || report.kind === "office") {
    return "Most AI tools don't mark documents at all, so this can't rule AI out.";
  }
  return null;
}

/**
 * The short answer shown at the top: status, which AI (and company), which
 * model, and when it was made. Any part we can't find is null.
 */
export function buildSummary(report: Report, provenance: Provenance | null | undefined): Summary {
  const p = provenance ?? null;
  let tool = p?.tool ?? null;
  let provider = p?.provider ?? null;

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

  let status: string;
  let tone: Tone;
  switch (report.verdict) {
    case "ai-signature-found":
      status = p?.aiLevel === "edited" ? "Edited with AI" : p?.aiLevel === "generated" ? "Made with AI" : "AI tool signature found";
      tone = "found";
      break;
    case "no-ai-signature-found":
      // If Content Credentials couldn't be read, "nothing found" would overstate what we know.
      if (report.notes.some((n) => C2PA_UNCHECKED.test(n))) {
        status = "No AI signature found (Content Credentials couldn't be checked)";
        tone = "";
      } else {
        status = "No AI signature found";
        tone = "clear";
      }
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
  const createdFromFields = report.fields.createdAt;
  return {
    status,
    tone,
    caveat: caveatFor(report),
    tool: found ? tool : null,
    provider: found ? provider : null,
    model: found ? p?.model ?? null : null,
    createdAt: found ? p?.createdAt ?? (typeof createdFromFields === "string" ? createdFromFields : null) : null,
  };
}
