// Generates the social preview image and icons into public/.
//   npm run images
// Output is committed, so deploys don't need sharp or any fonts.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(import.meta.dirname, "..", "public");
const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;

// The shield-with-check mark used in the page header (24x24 grid).
const SHIELD = `<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>`;

function shield({ x, y, size, stroke, width = 1.8 }) {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${SHIELD}</g>`;
}

const chip = (x, label, w) => `
  <rect x="${x}" y="486" width="${w}" height="44" rx="22" fill="#f4f4f4"/>
  <text x="${x + w / 2}" y="515" text-anchor="middle" font-family='${FONT}' font-size="22" fill="#5f5f5f">${label}</text>`;

// 1200x630 is the size most link previews expect.
const OG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="day" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#4b5a94"/><stop offset="0.2" stop-color="#4b5a94"/>
      <stop offset="0.33" stop-color="#ecc66c"/><stop offset="0.68" stop-color="#ecc66c"/>
      <stop offset="0.82" stop-color="#b9bed2"/><stop offset="1" stop-color="#4b5a94"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#ffffff"/>

  <!-- header pill, like the page -->
  <rect x="72" y="56" width="440" height="84" rx="42" fill="#f4f4f4"/>
  <circle cx="114" cy="98" r="42" fill="#e4e4e4"/>
  ${shield({ x: 88, y: 72, size: 52, stroke: "#1c1c1c" })}
  <text x="176" y="93" font-family='${FONT}' font-size="28" font-weight="600" fill="#1c1c1c">AI Provenance Check</text>
  <text x="176" y="124" font-family='${FONT}' font-size="24" fill="#7b7b7b">Metadata inspector</text>

  <!-- headline -->
  <text x="72" y="274" font-family='${FONT}' font-size="80" font-weight="700" fill="#1c1c1c">Was this file</text>
  <text x="72" y="362" font-family='${FONT}' font-size="80" font-weight="700" fill="#4a8a3c">made with AI?</text>
  <text x="72" y="428" font-family='${FONT}' font-size="31" fill="#7b7b7b">Reads a file's metadata for the AI tool, model, and date.</text>

  <!-- a real example of what a result shows: status, tool, model, date -->
  <rect x="716" y="146" width="412" height="236" rx="26" fill="#f4f4f4"/>
  <circle cx="754" cy="200" r="9" fill="#c77700"/>
  <text x="778" y="211" font-family='${FONT}' font-size="32" font-weight="700" fill="#1c1c1c">Made with AI</text>
  <text x="744" y="262" font-family='${FONT}' font-size="27" fill="#1c1c1c">By <tspan font-weight="700" fill="#4a8a3c">ChatGPT</tspan> (OpenAI)</text>
  <text x="744" y="304" font-family='${FONT}' font-size="27" fill="#1c1c1c">Model <tspan font-weight="700">gpt-image</tspan></text>
  <text x="744" y="346" font-family='${FONT}' font-size="25" fill="#7b7b7b">Created Nov 19, 2026</text>

  <!-- what it reads -->
  ${chip(72, "Images", 118)}
  ${chip(202, "PDF", 86)}
  ${chip(300, "Word", 100)}
  ${chip(412, "Excel", 100)}
  ${chip(524, "PowerPoint", 168)}
  <text x="1128" y="515" text-anchor="end" font-family='${FONT}' font-size="22" fill="#a8a8a8">Nothing is stored</text>

  <!-- day/night bar from the time card -->
  <rect x="72" y="574" width="1056" height="14" rx="7" fill="url(#day)"/>
  <circle cx="${72 + 1056 * 0.26}" cy="581" r="15" fill="#ffffff" stroke="#1c1c1c" stroke-width="5"/>
  <circle cx="${72 + 1056 * 0.7}" cy="581" r="15" fill="#ffffff" stroke="#1c1c1c" stroke-width="5"/>
</svg>`;

// Square icon: dark tile with the white shield.
const icon = (size, radius) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#1c1c1c"/>
  ${shield({ x: size * 0.2, y: size * 0.2, size: size * 0.6, stroke: "#ffffff", width: 1.9 })}
</svg>`;

async function write(name, data) {
  await fs.writeFile(path.join(OUT, name), data);
  console.log("wrote", name);
}

await write("og-image.png", await sharp(Buffer.from(OG)).png({ compressionLevel: 9 }).toBuffer());
await write("apple-touch-icon.png", await sharp(Buffer.from(icon(180, 0))).png().toBuffer());
await write("icon-512.png", await sharp(Buffer.from(icon(512, 112))).png().toBuffer());
await write("favicon.svg", icon(64, 14).trim() + "\n");
