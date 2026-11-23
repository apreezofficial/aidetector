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
