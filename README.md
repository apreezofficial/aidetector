# aidetector

Checks a file's metadata for signs that an AI tool created it. Runs locally, no uploads to other services. Written in TypeScript.

What it reads:

- **Images (PNG, JPEG, WebP, AVIF, HEIC, TIFF):** C2PA Content Credentials, EXIF/XMP/IPTC fields, PNG text chunks.
- **Office files (.docx, .xlsx, .pptx):** document properties (Application, Company, Template, and others).
- **PDF:** title, author, creator, producer, and C2PA credentials.
- **Plain text (.txt, .md, .csv):** no metadata exists, so it reports that it can't check.

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

To host it, run `npm install && npm run build` as the build step and `npm start` as the start command.

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
- `client/app.ts`, `client/time.ts`: the page's script (bundled to `public/app.js`, not committed).
- `public/`: HTML, CSS, and the sample files.
