// Points the page's meta tags (canonical, link previews, sitemap) at the real
// site address. Link-preview image URLs must be absolute, so they need to know
// where the site lives.
//
// Runs as part of `npm run build:client`. The files already contain the real
// address (below). Set SITE_URL, for example https://aidetector.example.com, to
// build for a different address, such as a staging site or a fork. With it
// unset, the files are left as they are.

import fs from "node:fs";
import path from "node:path";

const DEFAULT = "https://aidetector.apcodesphere.xyz";
const site = (process.env.SITE_URL || "").replace(/\/+$/, "");

if (!site || site === DEFAULT) {
  console.log(`site url: keeping ${DEFAULT}`);
  process.exit(0);
}
if (!/^https?:\/\/[^\s"'<>]+$/.test(site)) {
  console.error(`site url: "${site}" is not a valid http(s) address`);
  process.exit(1);
}

const publicDir = path.join(import.meta.dirname, "..", "public");
for (const name of ["index.html", "robots.txt", "sitemap.xml"]) {
  const file = path.join(publicDir, name);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  const after = before.split(DEFAULT).join(site);
  if (after !== before) fs.writeFileSync(file, after);
}
console.log(`site url: ${site}`);
