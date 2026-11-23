import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { inspectFile } from "../src/index.js";
import { matchAiText } from "../src/signatures.js";
import { pngTextChunks } from "../src/image.js";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "aidetect-test-"));
});
after(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

async function makeDocx(name: string, appXml: string): Promise<string> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("docProps/app.xml", appXml);
  const file = path.join(dir, name);
  await fs.writeFile(file, await zip.generateAsync({ type: "nodebuffer" }));
  return file;
}

async function makePdf(name: string, producer: string): Promise<string> {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.setProducer(producer);
  const file = path.join(dir, name);
  await fs.writeFile(file, await doc.save());
  return file;
}

// Minimal PNG: signature, IHDR, one tEXt chunk, IEND. CRCs are not checked by
// our parser, so they are left zeroed.
function makePng(keyword: string, text: string): Buffer {
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
  const tEXt = Buffer.concat([Buffer.from(keyword + "\0", "latin1"), Buffer.from(text, "latin1")]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("tEXt", tEXt),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("matchAiText recognises IPTC AI source types and tool names", () => {
  assert.equal(matchAiText("http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"), "trainedAlgorithmicMedia");
  assert.equal(matchAiText("Generated with ChatGPT"), "ChatGPT");
  assert.equal(matchAiText("Stable Diffusion XL"), "Stable Diffusion");
  assert.equal(matchAiText("Microsoft Office Word"), null);
  assert.equal(matchAiText(""), null);
  assert.equal(matchAiText(undefined), null);
});

test("docx with an AI tool in Application is flagged", async () => {
  const file = await makeDocx(
    "ai.docx",
    `<?xml version="1.0"?><Properties><Application>ChatGPT</Application></Properties>`
  );
  const r = await inspectFile(file);
  assert.equal(r.kind, "office");
  assert.equal(r.verdict, "ai-signature-found");
  assert.equal(r.fields.Application, "ChatGPT");
  assert.ok(r.signals.some((s) => s.match === "ChatGPT"));
});

test("docx from ordinary Word has no AI signature", async () => {
  const file = await makeDocx(
    "human.docx",
    `<?xml version="1.0"?><Properties><Application>Microsoft Office Word</Application><Company>Acme</Company></Properties>`
  );
  const r = await inspectFile(file);
  assert.equal(r.verdict, "no-ai-signature-found");
  assert.equal(r.fields.Application, "Microsoft Office Word");
  assert.equal(r.signals.length, 0);
});

test("pdf produced by an AI tool is flagged", async () => {
  const file = await makePdf("ai.pdf", "DALL-E export");
  const r = await inspectFile(file);
  assert.equal(r.kind, "pdf");
  assert.equal(r.verdict, "ai-signature-found");
  assert.equal(r.fields.producer, "DALL-E export");
});

test("pdf from a normal producer has no AI signature", async () => {
  const file = await makePdf("plain.pdf", "Skia/PDF m120");
  const r = await inspectFile(file);
  assert.equal(r.verdict, "no-ai-signature-found");
});

test("png text chunk naming an AI tool is flagged", async () => {
  const file = path.join(dir, "gen.png");
  await fs.writeFile(file, makePng("parameters", "a cat, Stable Diffusion XL, steps: 30"));
  const r = await inspectFile(file);
  assert.equal(r.kind, "image");
  assert.equal(r.verdict, "ai-signature-found");
  assert.ok(r.signals.some((s) => s.source === "png-text" && s.match === "Stable Diffusion"));
});

test("pngTextChunks reads tEXt keys and values", () => {
  const chunks = pngTextChunks(makePng("Software", "ChatGPT"));
  assert.deepEqual(chunks, [{ key: "Software", value: "ChatGPT" }]);
});

test("plain text reports nothing to check", async () => {
  const file = path.join(dir, "note.txt");
  await fs.writeFile(file, "hello");
  const r = await inspectFile(file);
  assert.equal(r.verdict, "no-metadata-to-check");
});

test("unsupported extension is reported, not thrown", async () => {
  const file = path.join(dir, "thing.xyz");
  await fs.writeFile(file, "x");
  const r = await inspectFile(file);
  assert.equal(r.verdict, "unsupported");
});

test("missing file returns an error verdict, not a throw", async () => {
  const r = await inspectFile(path.join(dir, "does-not-exist.pdf"));
  assert.equal(r.verdict, "error");
});
