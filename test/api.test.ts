import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import JSZip from "jszip";
import { createApp } from "../src/server.js";
import type { Report } from "../src/types.js";

let server: Server;
let base: string;

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function docxBuffer(application: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("docProps/app.xml", `<Properties><Application>${application}</Application></Properties>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function upload(name: string, buffer: Buffer): Promise<Response> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), name);
  return fetch(`${base}/api/inspect`, { method: "POST", body: form });
}

test("serves the upload page", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /AI Provenance Check/);
});

test("flags a docx with an AI application and keeps the original name", async () => {
  const res = await upload("draft.docx", await docxBuffer("ChatGPT"));
  assert.equal(res.status, 200);
  const body = (await res.json()) as Report;
  assert.equal(body.verdict, "ai-signature-found");
  assert.equal(body.file, "draft.docx");
});

test("clean docx returns no-signature verdict", async () => {
  const res = await upload("essay.docx", await docxBuffer("Microsoft Office Word"));
  const body = (await res.json()) as Report;
  assert.equal(body.verdict, "no-ai-signature-found");
});

test("rejects unsupported file types with 415", async () => {
  const res = await upload("song.mp3", Buffer.from("not really audio"));
  assert.equal(res.status, 415);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /not supported/);
});

test("request without a file returns 400", async () => {
  const res = await fetch(`${base}/api/inspect`, {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=x" },
    body: "--x--",
  });
  assert.equal(res.status, 400);
});

test("bundled samples are served and detected as AI-made", async () => {
  for (const name of ["sample-image.png", "sample.pdf"]) {
    const res = await fetch(`${base}/samples/${name}`);
    assert.equal(res.status, 200, `${name} should be served`);
    const bytes = Buffer.from(await res.arrayBuffer());

    const out = await upload(name, bytes);
    const body = (await out.json()) as Report;
    assert.equal(body.verdict, "ai-signature-found", `${name} should be flagged`);
    assert.ok(body.summary?.tool, `${name} should name the tool`);
    assert.ok(body.summary?.createdAt, `${name} should have a date`);
  }
});

test("reports the upload limit, which is smaller on Vercel", async () => {
  const res = await fetch(`${base}/api/limits`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { maxMb: number };
  assert.equal(body.maxMb, process.env.VERCEL ? 4 : 25);
});

test("the app is the default export, as hosts like Vercel expect", async () => {
  const mod = await import("../src/server.js");
  assert.equal(typeof mod.default, "function"); // an Express app is callable
  assert.equal(typeof mod.createApp, "function");
});
