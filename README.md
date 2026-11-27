# aidetector

Checks a file's metadata for signs that an AI tool created it. Runs locally, no uploads to other services. Written in TypeScript.

What it reads:

- **Images (PNG, JPEG, WebP, AVIF, HEIC, TIFF):** C2PA Content Credentials, EXIF/XMP/IPTC fields, PNG text chunks.
- **Office files (.docx, .xlsx, .pptx):** document properties (Application, Company, Template, and others).
- **PDF:** title, author, creator, producer, and C2PA credentials.
- **Plain text (.txt, .md, .csv):** no metadata exists, so it reports that it can't check.

**What it can detect.** Only tools that write a marker into their files:

- **ChatGPT:** records the tool, model, and date, on images and PDFs. Full result.
- **Gemini:** not confirmed. Two Google-credentialed JPGs I tested carried a "Created by Google Generative AI" record (shown as "Made with AI, by Google", with no tool or model name), but I have not tested freshly downloaded Gemini images, and images from Gemini that were pasted into apps, screenshotted, or re-saved had no metadata left. Google also adds an invisible SynthID watermark that only Google can read.
- **Others that mark files** (Adobe Firefly, Microsoft, Midjourney, Stable Diffusion tools) are covered by the same checks, but have not been tried on real files yet.
- **Tools that write nothing**, such as Claude, can't be detected, and neither can plain text from any tool.

Screenshots, re-saved copies, and files sent through apps that strip metadata lose those metadata markers. The optional OpenAI API check below can also look for pixel watermarks in supported images.

### OpenAI pixel watermark check

Set `OPENAI_API_KEY` on the server to enable OpenAI's Content Provenance API for PNG, JPEG, and WebP uploads. The API checks OpenAI C2PA credentials and SynthID embedded in image pixels, which can survive some screenshots, re-saves, and other changes. It detects supported OpenAI signals only; it does not verify images from Google or other AI providers. A detected watermark or trusted OpenAI credential is strong evidence that a supported image or PDF was processed by OpenAI tools such as ChatGPT. Not all generations carry supported signals, and a missing signal is not proof that a file is human-made. Without the key, the app performs only its existing local checks. When enabled, supported images are sent to OpenAI for verification; the app itself deletes its temporary upload after the check. API access, rate limits, and data handling follow OpenAI's API terms.

It is not proof either way. Metadata is easy to remove or edit, so a missing signature doesn't mean human-made, and a found signature only shows that a tool was involved.

## Setup

Requires Node.js 18 or newer.

```bash
npm install
```

## Web page

```bash
npm run dev          # builds the browser script, then runs the server from source
```

or, the way a host would run it:

```bash
npm run build        # compiles src/ to dist/ and bundles client/ to public/app.js
npm start            # node dist/server.js
```

Open http://localhost:3000, then drop a file anywhere on the page or choose one. The top of the result gives three lines: the status, which AI tool (and company) and model, and when it was made. Everything else is under "Full details". Uploads are deleted right after each check. Set `PORT` to use a different port.

To host it on a server, run `npm install && npm run build` as the build step and `npm start` as the start command.

### Vercel

Import the repo with the Express preset; `vercel.json` sets the build command. Uploads are capped at 4 MB there (Vercel's request limit; 25 MB elsewhere). The link-preview tags need a full address, which is set to `https://aidetector.apcodesphere.xyz` in `public/index.html`, `robots.txt`, and `sitemap.xml`. To build for a different address (a fork or a staging site), set `SITE_URL` and the build swaps it in.

## Command line

```bash
npm run detect -- path/to/file.png
npm run detect -- report.docx slides.pptx --json
```

## Checks and tests

```bash
npm run typecheck    # TypeScript, server and browser code
npm test             # runs the tests with tsx
npm run check        # both
```

Tests build their own DOCX, PDF, PNG, and JPEG fixtures in a temp folder.

## Layout

- `src/types.ts`: report and summary types shared by the server and the browser.
- `src/index.ts`: picks the reader by file type and builds the report.
- `src/signatures.ts`: AI tool names, companies, and IPTC source types to match.
- `src/c2pa.ts`, `src/image.ts`, `src/office.ts`, `src/pdf.ts`: per-format readers.
- `src/summary.ts`: the three-line summary.
- `src/server.ts`: upload server. `src/cli.ts`: command-line entry point.
- `client/app.ts`, `client/time.ts`: the page's script, bundled to `public/app.js`. That bundle **is committed**: Vercel picks the files in `public/` before it runs the build, so a script made only during the build would never be published. `npm test` fails if the committed copy is stale; fix it with `npm run build:client`.
- `public/`: HTML, CSS, icons, the link-preview image, and the sample files.
- `scripts/make-images.mjs`: regenerates the preview image and icons (`npm run images`).
- `scripts/site-url.mjs`: points the page's meta tags at the real site address during the build.
