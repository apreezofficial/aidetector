import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { summarizeStore, type C2paManifest, type C2paStore } from "../src/c2pa.js";
import { aiLevelOf, cleanCompany, identifyTool } from "../src/signatures.js";
import { inspectFile } from "../src/index.js";

const TRAINED = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

function store(manifests: Record<string, C2paManifest>, active: string = Object.keys(manifests)[0] ?? ""): C2paStore {
  return { active_manifest: active, manifests, validation_state: "Valid" };
}

test("PDF-style manifest: model in softwareAgent.name, tool in claim generator", () => {
  const { provenance } = summarizeStore(
    store({
      a: {
        claim_generator_info: [{ name: "ChatGPT" }],
        signature_info: { issuer: "OpenAI OpCo, LLC", common_name: "OpenAI Media Service", time: "2026-11-22T13:10:26+00:00" },
        assertions: [
          {
            label: "c2pa.actions.v2",
            data: {
              actions: [
                {
                  action: "c2pa.created",
                  digitalSourceType: TRAINED,
                  softwareAgent: { name: "gpt-6.2-sol", version: "gpt-6.2-sol" },
                  when: "2026-11-22T13:10:26.204Z",
                },
              ],
            },
          },
        ],
      },
    })
  );
  assert.deepEqual(provenance, {
    tool: "ChatGPT",
    provider: "OpenAI",
    model: "gpt-6.2-sol",
    createdAt: "2026-11-22T13:10:26.204Z",
    aiLevel: "generated",
  });
});

test("PNG-style manifest: tool in softwareAgent.name, model in .version", () => {
  const { provenance } = summarizeStore(
    store({
      a: {
        claim_generator_info: [{ name: "OpenAI Media Service API" }],
        signature_info: { issuer: "OpenAI OpCo, LLC" },
        assertions: [
          {
            label: "c2pa.actions.v2",
            data: { actions: [{ action: "c2pa.created", digitalSourceType: TRAINED, softwareAgent: { name: "ChatGPT", version: "gpt-image" }, when: "2026-11-19T21:16:12Z" }] },
          },
        ],
      },
    })
  );
  assert.ok(provenance);
  assert.equal(provenance.tool, "ChatGPT");
  assert.equal(provenance.model, "gpt-image");
  assert.equal(provenance.provider, "OpenAI");
});

test("agent name that is only the tool does not become the model", () => {
  const { provenance } = summarizeStore(
    store({
      a: {
        claim_generator_info: [{ name: "Some Service" }],
        signature_info: { issuer: "OpenAI OpCo, LLC" },
        assertions: [{ label: "c2pa.actions.v2", data: { actions: [{ action: "c2pa.created", digitalSourceType: TRAINED, softwareAgent: { name: "ChatGPT" } }] } }],
      },
    })
  );
  assert.ok(provenance);
  assert.equal(provenance.tool, "ChatGPT");
  assert.equal(provenance.model, null);
});

test("a later edit by another app does not hide the AI origin", () => {
  const { provenance, fields } = summarizeStore(
    store(
      {
        edit: {
          claim_generator_info: [{ name: "Photo Editor" }],
          signature_info: { issuer: "Editor Inc." },
          assertions: [{ label: "c2pa.actions.v2", data: { actions: [{ action: "c2pa.transcoded", digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced" }] } }],
        },
        origin: {
          claim_generator_info: [{ name: "Midjourney" }],
          signature_info: { issuer: "Midjourney Inc." },
          assertions: [{ label: "c2pa.actions.v2", data: { actions: [{ action: "c2pa.created", digitalSourceType: TRAINED, when: "2026-01-02T03:04:05Z" }] } }],
        },
      },
      "edit"
    )
  );
  assert.ok(provenance);
  assert.equal(provenance.tool, "Midjourney");
  assert.equal(provenance.aiLevel, "generated");
  assert.equal(provenance.createdAt, "2026-01-02T03:04:05Z");
  assert.equal(fields.c2paManifestCount, 2);
});

test("algorithmic enhancement alone is not counted as AI", () => {
  const { provenance } = summarizeStore(
    store({
      a: {
        signature_info: { issuer: "Google LLC" },
        assertions: [{ label: "c2pa.actions.v2", data: { actions: [{ action: "c2pa.edited", digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced" }] } }],
      },
    })
  );
  assert.ok(provenance);
  assert.equal(provenance.aiLevel, null);
});

test("an empty store gives no provenance", () => {
  assert.deepEqual(summarizeStore({}), { fields: {}, provenance: null });
  assert.deepEqual(summarizeStore(null), { fields: {}, provenance: null });
});

test("aiLevelOf, cleanCompany and identifyTool helpers", () => {
  assert.equal(aiLevelOf(TRAINED), "generated");
  assert.equal(aiLevelOf("http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia"), "edited");
  assert.equal(aiLevelOf("http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture"), null);
  assert.equal(cleanCompany("OpenAI OpCo, LLC"), "OpenAI");
  assert.equal(cleanCompany("Google LLC"), "Google");
  assert.deepEqual(identifyTool("Made with Google AI"), { tool: "Google AI", provider: "Google" });
  assert.equal(identifyTool("Spanish imagen del dia"), null); // plain word, not the model
});

// ---- image with the AI marker only in XMP (the usual place outside C2PA) ----
let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "aidetect-prov-"));
});
after(() => fs.rm(dir, { recursive: true, force: true }));

function jpegWithXmp(xml: string): Buffer {
  const ns = Buffer.from("http://ns.adobe.com/xap/1.0/\0", "latin1");
  const body = Buffer.concat([ns, Buffer.from(xml, "utf8")]);
  const len = Buffer.alloc(2);
  len.writeUInt16BE(body.length + 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), len, body, Buffer.from([0xff, 0xd9])]);
}

test("jpeg with IPTC AI source type in XMP is flagged, with the tool named", async () => {
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreatorTool="Midjourney" Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></rdf:RDF></x:xmpmeta>`;
  const file = path.join(dir, "xmp.jpg");
  await fs.writeFile(file, jpegWithXmp(xmp));
  const r = await inspectFile(file);
  assert.equal(r.verdict, "ai-signature-found");
  assert.ok(r.summary);
  assert.equal(r.summary.tool, "Midjourney");
  assert.equal(r.summary.provider, "Midjourney");
  assert.equal(r.summary.status, "AI tool signature found");
});

test("clean jpeg has an empty summary with a clear status", async () => {
  // A real (tiny) JPEG with no credentials, so the C2PA reader can parse it.
  const file = path.join(dir, "clean.jpg");
  await sharp({ create: { width: 4, height: 4, channels: 3, background: "#ffffff" } }).jpeg().toFile(file);
  const r = await inspectFile(file);
  assert.equal(r.verdict, "no-ai-signature-found");
  assert.ok(r.summary);
  assert.equal(r.summary.status, "No AI signature found");
  assert.equal(r.summary.tone, "clear");
  assert.equal(r.summary.tool, null);
});

test("a file the C2PA reader cannot parse gets the honest status, not an all-clear", async () => {
  const file = path.join(dir, "unreadable.jpg");
  await fs.writeFile(file, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const r = await inspectFile(file);
  assert.equal(r.verdict, "no-ai-signature-found");
  assert.ok(r.summary);
  assert.match(r.summary.status, /couldn't be checked/);
});

// ---- honest status when Content Credentials couldn't be read ----
import { buildSummary } from "../src/summary.js";
import type { Report } from "../src/types.js";

function reportWith(notes: string[]): Report {
  return {
    file: "x.png", kind: "image", verdict: "no-ai-signature-found", summary: null,
    signals: [], fields: {}, notes, disclaimer: "",
  };
}

test("status says so when C2PA could not be read, instead of a plain all-clear", () => {
  for (const note of [
    "C2PA read failed: Cannot find module './index.node'",
    "Content Credentials (C2PA) could not be checked: the reader is not available on this server",
  ]) {
    const s = buildSummary(reportWith([note]), null);
    assert.match(s.status, /couldn't be checked/);
    assert.equal(s.tone, "");
  }
});

test("a file with no credentials at all still gets the plain all-clear", () => {
  const s = buildSummary(reportWith([]), null);
  assert.equal(s.status, "No AI signature found");
  assert.equal(s.tone, "clear");
});

// ---- Google's credentials: no tool or model name, only a description ----
test("Google-style manifest: tool comes from the description, SynthID is noted, original beats the later edit", () => {
  const { provenance, fields } = summarizeStore(
    store(
      {
        opened: {
          claim_generator_info: [{ name: "Google C2PA Core Generator Library" }],
          signature_info: { issuer: "Google LLC", common_name: "Google Media Processing Services", time: "2026-10-29T01:25:53+00:00" },
          assertions: [
            {
              label: "c2pa.actions.v2",
              data: {
                actions: [
                  { action: "c2pa.opened", description: "Opened by Google" },
                  { action: "c2pa.transcoded", digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced" },
                ],
              },
            },
          ],
        },
        created: {
          claim_generator_info: [{ name: "Google C2PA Core Generator Library" }],
          signature_info: { issuer: "Google LLC", common_name: "Google Media Processing Services", time: "2026-10-29T01:23:54+00:00" },
          assertions: [
            {
              label: "c2pa.actions.v2",
              data: {
                actions: [
                  { action: "c2pa.created", description: "Created by Google Generative AI.", digitalSourceType: TRAINED },
                  { action: "c2pa.edited", description: "Applied imperceptible SynthID watermark.", digitalSourceType: TRAINED },
                ],
              },
            },
          ],
        },
      },
      "opened"
    )
  );
  assert.ok(provenance);
  assert.equal(provenance.tool, "Google Generative AI");
  assert.equal(provenance.provider, "Google");
  assert.equal(provenance.model, null); // Google doesn't write a model name
  assert.equal(provenance.aiLevel, "generated");
  assert.equal(provenance.createdAt, "2026-10-29T01:23:54+00:00"); // the original's time, not the later copy's
  assert.equal(fields.c2paDescription, "Created by Google Generative AI.");
  assert.match(String(fields.c2paWatermark), /SynthID/);
});

test("no watermark field when the credentials don't mention one", () => {
  const { fields } = summarizeStore(
    store({
      a: {
        signature_info: { issuer: "OpenAI OpCo, LLC" },
        assertions: [{ label: "c2pa.actions.v2", data: { actions: [{ action: "c2pa.created", digitalSourceType: TRAINED, softwareAgent: { name: "ChatGPT", version: "gpt-image" } }] } }],
      },
    })
  );
  assert.equal(fields.c2paWatermark, undefined);
});

// ---- caveats: why "nothing found" can't rule AI out ----
test("caveat appears for images and documents with no signature, not for found or text files", () => {
  const withKind = (kind: Report["kind"], verdict: Report["verdict"]): Report => ({ ...reportWith([]), kind, verdict });
  assert.match(buildSummary(withKind("image", "no-ai-signature-found"), null).caveat ?? "", /Screenshots, re-saved copies/);
  assert.match(buildSummary(withKind("pdf", "no-ai-signature-found"), null).caveat ?? "", /don't mark documents/);
  assert.match(buildSummary(withKind("office", "no-ai-signature-found"), null).caveat ?? "", /don't mark documents/);
  assert.equal(buildSummary(withKind("image", "ai-signature-found"), null).caveat, null);
  assert.equal(buildSummary(withKind("text", "no-metadata-to-check"), null).caveat, null);
});

// ---- a Gemini-style PNG: the AI marker lives in an XMP iTXt chunk ----
function pngWithItxt(keyword: string, text: string): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  // keyword\0, compression flag 0, method 0, language\0, translated keyword\0, text
  const itxt = Buffer.concat([Buffer.from(keyword + "\0", "utf8"), Buffer.from([0, 0]), Buffer.from("\0\0", "utf8"), Buffer.from(text, "utf8")]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("iTXt", itxt),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("png whose XMP chunk says Made with Google AI is flagged and the tool is named", async () => {
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/" photoshop:Credit="Made with Google AI"/></rdf:RDF></x:xmpmeta>`;
  const file = path.join(dir, "gemini-style.png");
  await fs.writeFile(file, pngWithItxt("XML:com.adobe.xmp", xmp));
  const r = await inspectFile(file);
  assert.equal(r.verdict, "ai-signature-found");
  assert.ok(r.summary);
  assert.equal(r.summary.tool, "Google AI");
  assert.equal(r.summary.provider, "Google");
});
