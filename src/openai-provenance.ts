import fs from "node:fs/promises";
import type { Fields, Signal } from "./types.js";

interface ApiResult {
  type?: string;
  outcome?: string;
  validation_state?: string;
  issuer?: string | null;
  model?: string | null;
  generated_at?: string | null;
}

interface ApiResponse {
  results?: ApiResult[];
  error?: { message?: string };
}

export interface OpenAiProvenanceResult {
  fields: Fields;
  signals: Signal[];
  notes: string[];
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Uses OpenAI's official provenance endpoint when OPENAI_API_KEY is configured. */
export async function inspectOpenAiProvenance(filePath: string): Promise<OpenAiProvenanceResult> {
  const out: OpenAiProvenanceResult = { fields: {}, signals: [], notes: [] };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return out;

  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) return out;

  try {
    const bytes = await fs.readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), filePath.split(/[\\/]/).pop() || `upload${ext}`);
    const response = await fetch("https://api.openai.com/v1/content_provenance_checks", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const body = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      const detail = body.error?.message || `HTTP ${response.status}`;
      out.notes.push(`OpenAI provenance check failed: ${detail}`);
      return out;
    }

    for (const result of body.results ?? []) {
      if (result.type === "synthid") {
        out.fields.openAiSynthId = result.outcome ?? "unknown";
        if (result.outcome === "detected") {
          out.signals.push({
            source: "OpenAI SynthID check",
            field: "image pixels",
            match: "OpenAI SynthID watermark",
            value: "Detected by OpenAI Content Provenance API",
          });
        }
      } else if (result.type === "c2pa") {
        out.fields.openAiProvenanceC2pa = result.outcome ?? "unknown";
        if (result.validation_state) out.fields.openAiC2paValidation = result.validation_state;
        if (result.issuer) out.fields.openAiC2paIssuer = result.issuer;
        if (result.model) out.fields.openAiC2paModel = result.model;
        if (result.generated_at) out.fields.openAiC2paGeneratedAt = result.generated_at;
        if (result.outcome === "detected") {
          out.signals.push({
            source: "OpenAI Content Provenance API",
            field: "C2PA",
            match: "OpenAI Content Credentials",
            value: `Detected${result.issuer ? `; issuer ${result.issuer}` : ""}`,
          });
        }
      }
    }
  } catch (error) {
    out.notes.push(`OpenAI provenance check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return out;
}
