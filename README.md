# aidetector

Checks a file's metadata for signs that an AI tool created it. Runs locally, no uploads.

What it reads:

- **Images (PNG, JPEG, WebP, AVIF, TIFF):** C2PA Content Credentials, EXIF/XMP/IPTC fields, PNG text chunks.
- **Office files (.docx, .xlsx, .pptx):** document properties (Application, Company, Template, and others).
- **PDF:** title, author, creator, producer, and C2PA credentials.
- **Plain text (.txt, .md, .csv):** no metadata exists, so it reports that it can't check.

It is not proof either way. Metadata is easy to remove or edit, so a missing signature doesn't mean human-made, and a found signature only shows that a tool was involved.

## Setup

Requires Node.js 18 or newer.

```bash
npm install
```

## Usage

```bash
npm run detect -- path/to/file.png
npm run detect -- report.docx slides.pptx --json
```

## Web page

```bash
npm start
```

Open http://localhost:3000, then drop a file anywhere on the page or choose one. The top of the result gives three lines: the status, which AI tool (and company) and model, and when it was made. Everything else is under "Full details". Uploads are deleted right after each check. Set `PORT` to use a different port.

## Tests

```bash
npm test
```

Tests build their own DOCX, PDF, and PNG fixtures in a temp folder.

## Layout

- `bin/aidetect.js`: command-line entry point.
- `src/index.js`: picks the reader by file type and builds the report.
- `src/signatures.js`: AI tool names and IPTC source types to match.
- `src/c2pa.js`, `src/image.js`, `src/office.js`, `src/pdf.js`: per-format readers.

## Next

- A web UI on top of `inspectFile` (planned after the local tests pass).
- Test against real AI-generated images. The C2PA path is written but not yet checked against a file that actually carries a manifest.
