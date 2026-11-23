import { scanValue, identifyTool, aiLevelOf, cleanCompany } from "./signatures.js";
import type { Fields, Provenance, Signal } from "./types.js";

// The C2PA reader is a native library that is downloaded at install time. Load
// it on first use so that, if it is missing on a host, the server still starts
// and everything else (EXIF, XMP, Office, PDF fields) keeps working.
type C2paModule = typeof import("@contentauth/c2pa-node");
type C2paReader = Awaited<ReturnType<C2paModule["Reader"]["fromAsset"]>>;

let c2paModule: Promise<C2paModule | null> | undefined;
function loadC2pa(): Promise<C2paModule | null> {
  c2paModule ??= import("@contentauth/c2pa-node").catch(() => null);
  return c2paModule;
}

// File types the C2PA SDK can read a manifest from.
export const C2PA_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/tiff",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

// The parts of a C2PA manifest store that we read.
export interface C2paAction {
  action?: string;
  digitalSourceType?: string;
  softwareAgent?: string | { name?: string; version?: string };
  when?: string;
}
export interface C2paAssertion {
  label?: string;
  data?: { actions?: C2paAction[] };
}
export interface C2paManifest {
  claim_generator?: string;
  claim_generator_info?: { name?: string }[];
  signature_info?: { issuer?: string; common_name?: string; time?: string };
  assertions?: C2paAssertion[];
}
export interface C2paStore {
  active_manifest?: string;
  manifests?: Record<string, C2paManifest>;
  validation_state?: string;
  validation_status?: { explanation: string }[];
}

export interface C2paResult {
  fields: Fields;
  signals: Signal[];
  notes: string[];
  provenance: Provenance | null;
}

const actionsOf = (manifest: C2paManifest | null | undefined): C2paAction[] =>
  (manifest?.assertions ?? [])
    .filter((a) => a.label?.startsWith("c2pa.actions"))
    .flatMap((a) => a.data?.actions ?? []);

interface Candidate {
  m: C2paManifest;
  a: C2paAction;
  level: "generated" | "edited";
}

/**
 * Turns a C2PA manifest store into report fields plus a provenance summary
 * (tool, company, model, date, how much AI). A file edited several times has
 * several manifests; the "origin" is the one that says AI made it, so a later
 * edit by another app doesn't hide where the file came from.
 */
export function summarizeStore(store: C2paStore | null | undefined): {
  fields: Fields;
  provenance: Provenance | null;
} {
  const manifests = Object.values(store?.manifests ?? {});
  const active =
    (store?.active_manifest ? store.manifests?.[store.active_manifest] : undefined) ?? manifests[0] ?? null;
  const fields: Fields = {};
  if (!store || !active) return { fields, provenance: null };

  // Every manifest action that marks AI involvement; generated beats edited,
  // and an explicit "created" action beats the rest.
  const candidates: Candidate[] = [];
  for (const m of manifests) {
    for (const a of actionsOf(m)) {
      const level = aiLevelOf(a.digitalSourceType);
      if (level) candidates.push({ m, a, level });
    }
  }
  const rank = (c: Candidate) => (c.level === "generated" ? 0 : 2) + (c.a.action === "c2pa.created" ? 0 : 1);
  candidates.sort((x, y) => rank(x) - rank(y));
  const best = candidates[0] ?? null;

  const origin = best?.m ?? active;
  const originAction = best?.a ?? actionsOf(origin)[0] ?? null;

  const agent = originAction?.softwareAgent;
  const agentName = typeof agent === "string" ? agent : agent?.name ?? null;
  const agentVersion = typeof agent === "object" ? agent?.version ?? null : null;
  const generatorName = origin?.claim_generator_info?.[0]?.name ?? origin?.claim_generator ?? null;
  const signer = origin?.signature_info;

  // Some tools put the model in softwareAgent.version, others in .name.
  let model: string | null = agentVersion || agentName || null;
  let tool: string | null = null;
  let provider: string | null = null;
  for (const c of [agentName, generatorName]) {
    const id = c && c !== model ? identifyTool(c) : null;
    if (id?.tool) {
      tool = id.tool;
      provider = id.provider;
      break;
    }
  }
  if (!tool && model && !agentVersion) {
    // The agent name was the tool itself, not a model.
    const id = identifyTool(model);
    if (id?.tool) {
      tool = id.tool;
      provider = id.provider;
      model = null;
    }
  }
  if (!provider) {
    for (const c of [agentName, generatorName, signer?.issuer, signer?.common_name]) {
      const id = c ? identifyTool(c) : null;
      if (id?.provider) {
        provider = id.provider;
        break;
      }
    }
  }
  if (!provider) provider = cleanCompany(signer?.issuer);
  if (model && model === tool) model = null;

  const createdAt = originAction?.when ?? signer?.time ?? null;

  fields.c2paClaimGenerator = active.claim_generator_info?.[0]?.name ?? active.claim_generator ?? null;
  fields.c2paIssuer = active.signature_info?.issuer ?? null;
  fields.c2paSigner = active.signature_info?.common_name ?? null;
  fields.c2paSignedAt = active.signature_info?.time ?? null;
  if (originAction?.action) fields.c2paAction = originAction.action;
  if (model) fields.c2paModel = model;
  if (createdAt) fields.c2paCreatedAt = createdAt;
  if (best) fields.c2paAiLevel = best.level;
  if (manifests.length > 1) fields.c2paManifestCount = manifests.length;
  fields.c2paValidationState = store.validation_state ?? null;
  const problems = [...new Set((store.validation_status ?? []).map((v) => v.explanation))];
  if (problems.length) fields.c2paValidationIssues = problems;

  return {
    fields,
    provenance: { tool, provider, model, createdAt, aiLevel: best?.level ?? null },
  };
}

/**
 * Reads the C2PA manifest (Content Credentials). A file with no manifest is a
 * normal outcome, not an error.
 */
export async function inspectC2pa(filePath: string, mimeType: string): Promise<C2paResult> {
  const out: C2paResult = { fields: {}, signals: [], notes: [], provenance: null };
  if (!C2PA_MIME_TYPES.has(mimeType)) return out;

  const c2pa = await loadC2pa();
  if (!c2pa) {
    out.notes.push("Content Credentials (C2PA) could not be checked: the reader is not available on this server");
    return out;
  }

  let reader: C2paReader | null = null;
  try {
    reader = await c2pa.Reader.fromAsset({ path: filePath, mimeType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/no manifest|manifest.*not found|ManifestNotFound/i.test(msg)) {
      out.fields.c2paPresent = false;
    } else {
      out.notes.push(`C2PA read failed: ${msg}`);
    }
    return out;
  }
  if (!reader) {
    out.fields.c2paPresent = false;
    return out;
  }

  out.fields.c2paPresent = true;
  try {
    const store = reader.json() as unknown as C2paStore;
    const { fields, provenance } = summarizeStore(store);
    Object.assign(out.fields, fields);
    out.provenance = provenance;
    // Scan the manifests themselves, not the validator's log messages.
    out.signals.push(...scanValue("c2pa", store.manifests ?? {}));
  } catch (err) {
    out.notes.push(`C2PA parse failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return out;
}
