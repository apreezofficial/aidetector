import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const ROOT = path.join(import.meta.dirname, "..");

// public/app.js is committed even though it is built from client/. Vercel decides
// which files in public/ to publish before it runs the build command, so a script
// that only exists after the build would never be served. This test keeps the
// committed copy from going stale.
test("public/app.js is up to date with client/app.ts", async () => {
  const result = await build({
    entryPoints: [path.join(ROOT, "client", "app.ts")],
    bundle: true,
    format: "esm",
    target: "es2022",
    write: false,
    outfile: path.join(ROOT, "public", "app.js"),
    logLevel: "silent",
  });
  const expected = result.outputFiles[0]?.text;
  assert.ok(expected, "esbuild produced no output");
  const actual = await fs.readFile(path.join(ROOT, "public", "app.js"), "utf8");
  assert.equal(actual, expected, "public/app.js is stale. Run: npm run build:client");
});

test("the page loads the committed script as a module", async () => {
  const html = await fs.readFile(path.join(ROOT, "public", "index.html"), "utf8");
  assert.match(html, /<script type="module" src="\/app\.js"><\/script>/);
});
