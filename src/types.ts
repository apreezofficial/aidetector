// Shapes shared by the server, the command-line tool, and the browser script.

export type Verdict =
  | "ai-signature-found"
  | "no-ai-signature-found"
  | "no-metadata-to-check"
  | "unsupported"
  | "error";

export type Tone = "found" | "clear" | "error" | "";

// How much AI was involved: made by a model, or real content mixed with AI parts.
export type AiLevel = "generated" | "edited";

export interface Signal {
  source: string;
  field: string;
  match: string;
  value: string;
  /** How many times the same match repeated in the same source. */
  count?: number;
}

export type FieldValue = string | number | boolean | string[] | null;
export type Fields = Record<string, FieldValue>;

export interface Provenance {
  tool: string | null;
  provider: string | null;
  model: string | null;
  createdAt: string | null;
  aiLevel: AiLevel | null;
}

// The three-line answer shown at the top of a result.
export interface Summary {
  status: string;
  tone: Tone;
  tool: string | null;
  provider: string | null;
  model: string | null;
  createdAt: string | null;
}

export type FileKind = "image" | "office" | "pdf" | "text" | "unsupported";

export interface Report {
  file: string;
  kind: FileKind;
  verdict: Verdict;
  summary: Summary | null;
  signals: Signal[];
  fields: Fields;
  notes: string[];
  disclaimer: string;
}

// What each per-format reader returns before the report is assembled.
export interface Inspection {
  signals: Signal[];
  fields: Fields;
  notes: string[];
  provenance?: Provenance | null;
}
