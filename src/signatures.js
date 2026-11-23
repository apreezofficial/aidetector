// What counts as an AI signal, and how to name the tool and company behind it.
// Expect occasional false positives (a person named "Claude" in a title field);
// the report always shows the exact text that matched.

// IPTC "digitalSourceType" values that mean AI was involved.
export const AI_DIGITAL_SOURCE_TYPES = [
  "trainedAlgorithmicMedia",
  "compositeWithTrainedAlgorithmicMedia",
  "compositeSynthetic",
  "algorithmicMedia",
];

// One table drives matching, the tool name, and the company name.
// tool: null means the text only tells us the company.
export const AI_TOOLS = [
  { pattern: /\bchatgpt\b/i, tool: "ChatGPT", provider: "OpenAI" },
  { pattern: /\bdall[-\s·]?e\b/i, tool: "DALL·E", provider: "OpenAI" },
  { pattern: /\bsora\b/i, tool: "Sora", provider: "OpenAI" },
  { pattern: /\bopenai\b/i, tool: null, provider: "OpenAI" },
  { pattern: /\bgemini\b/i, tool: "Gemini", provider: "Google" },
  { pattern: /\bimagen[-\s]?\d/i, tool: "Imagen", provider: "Google" },
  { pattern: /\bmade with google ai\b/i, tool: "Google AI", provider: "Google" },
  { pattern: /\bmidjourney\b/i, tool: "Midjourney", provider: "Midjourney" },
  { pattern: /\bstable\s?diffusion\b/i, tool: "Stable Diffusion", provider: "Stability AI" },
  { pattern: /\bstability\s?ai\b/i, tool: null, provider: "Stability AI" },
  { pattern: /\bfirefly\b/i, tool: "Adobe Firefly", provider: "Adobe" },
  { pattern: /\bcopilot\b/i, tool: "Copilot", provider: "Microsoft" },
  { pattern: /\bbing\s+image\s+creator\b/i, tool: "Bing Image Creator", provider: "Microsoft" },
  { pattern: /\bclaude\b/i, tool: "Claude", provider: "Anthropic" },
  { pattern: /\banthropic\b/i, tool: null, provider: "Anthropic" },
  { pattern: /\bleonardo\.ai\b/i, tool: "Leonardo.Ai", provider: "Leonardo.Ai" },
  { pattern: /\bideogram\b/i, tool: "Ideogram", provider: "Ideogram" },
  { pattern: /\bgrok\b/i, tool: "Grok", provider: "xAI" },
  { pattern: /\bmeta\s+ai\b/i, tool: "Meta AI", provider: "Meta" },
  { pattern: /\bcomfyui\b/i, tool: "ComfyUI", provider: null },
  { pattern: /\bautomatic1111\b/i, tool: "Stable Diffusion WebUI", provider: null },
  // Parameter blocks that Stable Diffusion UIs write into PNG/JPEG metadata.
  { pattern: /\bSteps:\s*\d+,\s*Sampler:/, tool: "Stable Diffusion", provider: null },
  { pattern: /"class_type"\s*:/, tool: "ComfyUI", provider: null },
];

// Returns the matched text, or null.
export function matchAiText(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  for (const type of AI_DIGITAL_SOURCE_TYPES) {
    if (text.includes(type)) return type;
  }
  for (const { pattern } of AI_TOOLS) {
    const m = text.match(pattern);
    if (m) return m[0];
  }
  return null;
}

// Names the tool and company in a piece of text, or null.
export function identifyTool(text) {
  if (typeof text !== "string") return null;
  for (const { pattern, tool, provider } of AI_TOOLS) {
    if (pattern.test(text)) return { tool, provider };
  }
  return null;
}

// How much AI was involved, from an IPTC digitalSourceType value.
//   "generated": made by an AI model
//   "edited":    a real source combined with AI-made elements
// "algorithmicallyEnhanced" (filters, upscaling) is deliberately not counted.
export function aiLevelOf(uri) {
  if (typeof uri !== "string") return null;
  if (uri.includes("compositeWithTrainedAlgorithmicMedia") || uri.includes("compositeSynthetic")) return "edited";
  if (uri.includes("trainedAlgorithmicMedia") || /algorithmicMedia$/.test(uri)) return "generated";
  return null;
}

// "OpenAI OpCo, LLC" -> "OpenAI", "Google LLC" -> "Google".
export function cleanCompany(name) {
  if (typeof name !== "string") return null;
  const cleaned = name
    .replace(/[,\s]+(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Limited|Corp\.?|Corporation|OpCo)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

// Walks any parsed metadata and records every string that matches.
// `skipKeys` lists fields that hold people's names, which we don't match on.
export function scanValue(source, value, path = "", out = [], skipKeys = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    const match = matchAiText(value);
    if (match) {
      out.push({ source, field: path || "(root)", match, value: value.slice(0, 200) });
    }
    return out;
  }
  if (value instanceof Date || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return out; // binary blobs and dates carry nothing we can match on
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanValue(source, v, `${path}[${i}]`, out, skipKeys));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (skipKeys.includes(k)) continue;
      scanValue(source, v, path ? `${path}.${k}` : k, out, skipKeys);
    }
  }
  return out;
}
