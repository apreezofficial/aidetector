import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/server.js";

const PUBLIC = path.join(import.meta.dirname, "..", "public");

let html: string;
let server: Server;
let base: string;

before(async () => {
  html = await fs.readFile(path.join(PUBLIC, "index.html"), "utf8");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((resolve) => server.close(() => resolve())));

// Reads <meta property|name="key" content="..."> in either attribute order.
function meta(key: string): string | undefined {
  const a = new RegExp(`<meta[^>]*(?:property|name)="${key}"[^>]*content="([^"]*)"`, "i").exec(html);
  const b = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:property|name)="${key}"`, "i").exec(html);
  return (a ?? b)?.[1];
}

function link(rel: string): string | undefined {
  return new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]*)"`, "i").exec(html)?.[1];
}

// Width and height from a PNG's IHDR chunk.
async function pngSize(file: string): Promise<{ width: number; height: number; bytes: number }> {
  const buf = await fs.readFile(file);
  assert.equal(buf.toString("ascii", 1, 4), "PNG", `${file} should be a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
}

const fileFor = (url: string) => path.join(PUBLIC, new URL(url).pathname);

test("title and description are present and a sensible length", () => {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  assert.ok(title.length >= 10 && title.length <= 65, `title length ${title.length}`);
  const description = meta("description") ?? "";
  assert.ok(description.length >= 70 && description.length <= 160, `description length ${description.length}`);
});

test("Open Graph tags are complete", () => {
  for (const key of ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:alt"]) {
    assert.ok(meta(key), `${key} should be set`);
  }
  assert.equal(meta("og:type"), "website");
});

test("Twitter card uses a large image", () => {
  assert.equal(meta("twitter:card"), "summary_large_image");
  for (const key of ["twitter:title", "twitter:description", "twitter:image"]) {
    assert.ok(meta(key), `${key} should be set`);
  }
});

test("canonical, og:url, og:image and twitter:image share one https address", () => {
  const origins = [link("canonical"), meta("og:url"), meta("og:image"), meta("twitter:image")].map((u) => {
    assert.ok(u, "a URL is missing");
    assert.match(u, /^https:\/\//, `${u} should be absolute https`);
    return new URL(u).origin;
  });
  assert.equal(new Set(origins).size, 1, `origins differ: ${origins.join(", ")}`);
});

test("the preview image exists, is 1200x630, and is small enough", async () => {
  const url = meta("og:image");
  assert.ok(url);
  const size = await pngSize(fileFor(url));
  assert.deepEqual([size.width, size.height], [1200, 630]);
  assert.equal(String(size.width), meta("og:image:width"));
  assert.equal(String(size.height), meta("og:image:height"));
  assert.ok(size.bytes < 300 * 1024, `og image is ${size.bytes} bytes`);
  assert.equal(meta("twitter:image"), url);
});

test("icons referenced in the page exist", async () => {
  const icon = link("icon");
  const touch = link("apple-touch-icon");
  assert.ok(icon && touch);
  await fs.access(path.join(PUBLIC, icon));
  const size = await pngSize(path.join(PUBLIC, touch));
  assert.deepEqual([size.width, size.height], [180, 180]);
});

test("the web manifest is valid and its icons exist", async () => {
  const href = link("manifest");
  assert.ok(href);
  const manifest = JSON.parse(await fs.readFile(path.join(PUBLIC, href), "utf8")) as {
    name: string;
    icons: { src: string }[];
  };
  assert.ok(manifest.name);
  assert.ok(manifest.icons.length >= 2);
  for (const { src } of manifest.icons) await fs.access(path.join(PUBLIC, src));
});

test("structured data parses and matches the page", () => {
  const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(raw, "JSON-LD block missing");
  const data = JSON.parse(raw) as { "@type": string; name: string; url: string };
  assert.equal(data["@type"], "WebApplication");
  assert.equal(data.name, meta("og:site_name"));
  assert.equal(data.url, link("canonical"));
});

test("robots.txt points to the sitemap, which lists the home page", async () => {
  const robots = await fs.readFile(path.join(PUBLIC, "robots.txt"), "utf8");
  const sitemapUrl = /^Sitemap:\s*(\S+)/m.exec(robots)?.[1];
  assert.ok(sitemapUrl, "robots.txt should name the sitemap");
  const sitemap = await fs.readFile(path.join(PUBLIC, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>${new URL(link("canonical")!).origin}/</loc>`));
  assert.match(robots, /Disallow:\s*\/api\//);
});

test("the server serves the preview image, robots, sitemap and manifest", async () => {
  const cases: [string, RegExp][] = [
    ["/og-image.png", /image\/png/],
    ["/favicon.svg", /image\/svg\+xml/],
    ["/robots.txt", /text\/plain/],
    ["/sitemap.xml", /xml/],
    ["/site.webmanifest", /json|manifest/],
  ];
  for (const [url, type] of cases) {
    const res = await fetch(`${base}${url}`);
    assert.equal(res.status, 200, `${url} should be served`);
    assert.match(res.headers.get("content-type") ?? "", type, `${url} content type`);
  }
});
