import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createApp } from "../server.js";

let server;
let base;

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

async function docxBuffer(application) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("docProps/app.xml", `<Properties><Application>${application}</Application></Properties>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function upload(name, buffer) {
  const form = new FormData();
  form.append("file", new Blob([buffer]), name);
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
  const body = await res.json();
  assert.equal(body.verdict, "ai-signature-found");
  assert.equal(body.file, "draft.docx");
});

test("clean docx returns no-signature verdict", async () => {
  const res = await upload("essay.docx", await docxBuffer("Microsoft Office Word"));
  const body = await res.json();
  assert.equal(body.verdict, "no-ai-signature-found");
});

test("rejects unsupported file types with 415", async () => {
  const res = await upload("song.mp3", Buffer.from("not really audio"));
  assert.equal(res.status, 415);
  const body = await res.json();
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
    const body = await out.json();
    assert.equal(body.verdict, "ai-signature-found", `${name} should be flagged`);
    assert.ok(body.summary.tool, `${name} should name the tool`);
    assert.ok(body.summary.createdAt, `${name} should have a date`);
  }
});
