import type { Report, Summary } from "../src/types.js";
import { apartLabel, cityName, dayPercent, formatClock, offsetMinutes, shortDate } from "./time.js";

// Whose time the second tile shows.
const OWNER = { name: "Precious", city: "Ekiti", zone: "Africa/Lagos" } as const;

const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const input = $<HTMLInputElement>("file-input");
const dropTitle = $("drop-title");
const statusLine = $("status");
const result = $("result");

// The server's upload limit differs by host (25 MB normally, less on Vercel).
let maxBytes = 25 * 1024 * 1024;
fetch("/api/limits")
  .then((r) => r.json() as Promise<{ maxMb: number }>)
  .then(({ maxMb }) => {
    maxBytes = maxMb * 1024 * 1024;
    const hint = $("drop-hint");
    hint.textContent = (hint.textContent ?? "").replace(/up to \d+ MB/, `up to ${maxMb} MB`);
  })
  .catch(() => {
    /* keep the default */
  });

// Friendly names for the raw field keys in "Full details".
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  author: "Author",
  subject: "Subject",
  keywords: "Keywords",
  creator: "Creator app",
  producer: "Producer",
  Application: "Application",
  AppVersion: "App version",
  Company: "Company",
  Template: "Template",
  Software: "Software",
  CreatorTool: "Creator tool",
  Make: "Camera make",
  Model: "Camera model",
  DigitalSourceType: "Source type",
  createdAt: "Created",
  modifiedAt: "Modified",
  pngTextKeys: "PNG text keys",
  c2paPresent: "Content Credentials",
  c2paClaimGenerator: "Credentials tool",
  c2paIssuer: "Issued by",
  c2paSigner: "Signed by",
  c2paSignedAt: "Signed at",
  c2paAction: "Action",
  c2paModel: "Model",
  c2paCreatedAt: "Created (credentials)",
  c2paAiLevel: "AI involvement",
  c2paManifestCount: "Credential records",
  c2paValidationState: "Validation",
  c2paValidationIssues: "Validation notes",
};

// ---- helpers ----

/** The zone dates are shown in. undefined = the device's own. */
let timeZone: string | undefined;
let lastReport: Report | null = null;

function setStatus(message: string, isError = false): void {
  statusLine.textContent = message;
  statusLine.className = isError ? "status error" : "status";
  statusLine.hidden = !message;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone });
}

function formatValue(key: string, value: unknown): string {
  if (key === "c2paPresent") return value ? "Present" : "None found";
  if (key.endsWith("At") && typeof value === "string") return formatDate(value);
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

function listItem(text: string, code?: string): HTMLLIElement {
  const li = make("li");
  li.append(text);
  if (code) li.append(make("code", undefined, code));
  return li;
}

function emptyItem<K extends "li" | "div">(tag: K, text: string): HTMLElementTagNameMap[K] {
  return make(tag, "empty", text);
}

// ---- rendering ----
function renderSummary(summary: Summary | null, verdict: string): void {
  const s: Summary = summary ?? { status: verdict, tone: "", tool: null, provider: null, model: null, createdAt: null };
  $("dot").className = `dot ${s.tone}`;
  $("s-status").textContent = s.status;

  const by = $("s-by");
  const date = $("s-date");
  const found = verdict === "ai-signature-found";
  by.hidden = date.hidden = !found;
  if (!found) return;

  // Line 2: which AI, then which model.
  const name = make("span", "acc", s.tool || s.provider || "an AI tool (name not stated)");
  const company = s.tool && s.provider ? ` (${s.provider})` : "";
  by.replaceChildren("By ", name, `${company} · Model ${s.model || "not stated"}`);

  // Line 3: when it was made.
  date.textContent = s.createdAt ? `Created ${formatDate(s.createdAt)}` : "Creation date not recorded";
}

function render(report: Report, { scroll = true }: { scroll?: boolean } = {}): void {
  lastReport = report;
  renderSummary(report.summary, report.verdict);
  $("result-file").textContent = report.file || "";

  const signals = $("signals");
  signals.replaceChildren();
  if (report.signals.length) {
    for (const s of report.signals) {
      const times = s.count && s.count > 1 ? ` ×${s.count}` : "";
      const field = s.field.replace(/urn:c2pa:[0-9a-f-]+/g, "manifest");
      signals.append(listItem(`"${s.match}"${times} in ${s.source}`, field));
    }
  } else {
    signals.append(emptyItem("li", "None found."));
  }

  const fields = $("fields");
  fields.replaceChildren();
  const entries = Object.entries(report.fields).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) fields.append(emptyItem("div", "No details found."));
  for (const [key, value] of entries) {
    const row = make("div", "row");
    row.append(make("dt", undefined, FIELD_LABELS[key] ?? key), make("dd", undefined, formatValue(key, value)));
    fields.append(row);
  }

  const notes = $("notes");
  notes.replaceChildren();
  $("notes-block").hidden = report.notes.length === 0;
  for (const n of report.notes) notes.append(listItem(n));

  $("disclaimer").textContent = report.disclaimer || "";
  result.hidden = false;
  if (scroll) result.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- upload ----
let busy = false;

async function check(file: File | undefined): Promise<void> {
  if (!file || busy) return;
  if (file.size > maxBytes) {
    const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
    setStatus(`That file is ${mb(file.size)} MB. The limit here is ${mb(maxBytes)} MB.`, true);
    input.value = "";
    return;
  }
  busy = true;
  dropTitle.textContent = file.name;
  setStatus("Checking…");
  result.hidden = true;
  try {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/inspect", { method: "POST", body });
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned an unexpected response (${res.status})`);
    }
    if (!res.ok) {
      const message = (data as { error?: string }).error;
      throw new Error(message || `Request failed (${res.status})`);
    }
    setStatus("");
    render(data as Report);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    busy = false;
    input.value = ""; // lets the same file be picked again
  }
}

input.addEventListener("change", () => void check(input.files?.[0]));

// "Try a sample": fetch the bundled file and run it through the same path as an upload.
document.querySelectorAll<HTMLButtonElement>("[data-sample]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    if (busy) return;
    const url = btn.dataset.sample ?? "";
    try {
      setStatus("Loading sample…");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Couldn't load the sample (${res.status})`);
      const blob = await res.blob();
      await check(new File([blob], url.split("/").pop() ?? "sample", { type: blob.type }));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
  })
);

// ---- drag and drop anywhere on the page ----
// Without preventDefault on the window, dropping a file outside the box makes
// the browser open the file instead of uploading it.
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth++;
  document.body.classList.add("dragging");
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) document.body.classList.remove("dragging");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging");
  void check(e.dataTransfer?.files?.[0]);
});

// ---- theme: System / Light / Dark ----
const themeButtons = document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]");

function currentChoice(): "light" | "dark" | "system" {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function paintTheme(): void {
  const choice = currentChoice();
  themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)));
}

themeButtons.forEach((b) =>
  b.addEventListener("click", () => {
    const choice = b.dataset.themeChoice;
    if (choice === "light" || choice === "dark") document.documentElement.dataset.theme = choice;
    else delete document.documentElement.dataset.theme;
    try {
      if (choice === "light" || choice === "dark") localStorage.setItem("theme", choice);
      else localStorage.removeItem("theme");
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
    paintTheme();
  })
);
paintTheme();

// ---- header: accent colour picker ----
const SWATCHES: ReadonlyArray<readonly [name: string, value: string]> = [
  ["Neutral", "neutral"],
  ["Blue", "#3b4bd6"],
  ["Green", "#4a8a3c"],
  ["Orange", "#b86e28"],
  ["Red", "#c4492f"],
  ["Purple", "#7b4fd0"],
  ["Pink", "#b94787"],
  ["Teal", "#347f7a"],
  ["Sky", "#3b7fbf"],
  ["Brown", "#7c5538"],
];

const identityBtn = $<HTMLButtonElement>("identity-btn");
const palette = $("palette");
const clockBtn = $<HTMLButtonElement>("clock-btn");
const zonesBox = $("zones");

function savedAccent(): string {
  try {
    return localStorage.getItem("accent") || "neutral";
  } catch {
    return "neutral";
  }
}

function applyAccent(value: string): void {
  if (value === "neutral") document.documentElement.style.removeProperty("--accent");
  else document.documentElement.style.setProperty("--accent", value);
  palette
    .querySelectorAll<HTMLButtonElement>(".swatch")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === value)));
  try {
    if (value === "neutral") localStorage.removeItem("accent");
    else localStorage.setItem("accent", value);
  } catch {
    /* storage unavailable */
  }
}

for (const [name, value] of SWATCHES) {
  const b = make("button", "swatch");
  b.type = "button";
  b.dataset.color = value;
  b.setAttribute("aria-label", name);
  b.setAttribute("aria-pressed", "false");
  b.style.setProperty("--swatch", value === "neutral" ? "var(--text)" : value);
  b.addEventListener("click", () => applyAccent(value));
  palette.append(b);
}
applyAccent(savedAccent());

// ---- header: clock and time card ----
// "Your time" is the device's zone; the other tile is the owner's. The tile you
// pick decides which zone the clock and the result dates use.
let useOwner = false;

interface MarkerRef {
  node: HTMLSpanElement;
  text: HTMLSpanElement;
}
interface TileRef {
  btn: HTMLButtonElement;
  title: HTMLSpanElement;
  sub: HTMLSpanElement;
}
interface PanelRefs {
  date: HTMLSpanElement;
  apart: HTMLElement;
  you: MarkerRef;
  owner: MarkerRef;
  youTile: TileRef;
  ownerTile: TileRef;
}

function marker(label: string, side: "above" | "below"): MarkerRef {
  const node = make("span", `tz-marker ${side}`);
  const text = make("span", "tz-label", label);
  node.append(text);
  return { node, text };
}

function tile(forOwner: boolean): TileRef {
  const btn = make("button", "tz-tile");
  btn.type = "button";
  const title = make("span", "tz-title");
  const sub = make("span", "tz-sub");
  btn.append(title, sub);
  btn.addEventListener("click", () => setActive(forOwner));
  return { btn, title, sub };
}

function buildPanel(): PanelRefs {
  zonesBox.replaceChildren();

  const head = make("div", "tz-head");
  const date = make("span", "tz-date");
  const apart = make("strong", "tz-apart");
  head.append(date, apart);

  const you = marker("You", "above");
  const owner = marker(OWNER.name, "below");
  const track = make("div", "tz-track-wrap");
  track.append(make("div", "tz-track"), owner.node, you.node);

  const hours = make("div", "tz-hours");
  for (const h of ["12AM", "6AM", "12PM", "6PM", "12AM"]) hours.append(make("span", undefined, h));

  const youTile = tile(false);
  const ownerTile = tile(true);
  const tiles = make("div", "tz-tiles");
  tiles.append(youTile.btn, ownerTile.btn);

  zonesBox.append(head, track, hours, tiles);
  return { date, apart, you, owner, youTile, ownerTile };
}

const panel = buildPanel();

// Updates only the changing bits (times, marker positions).
function paintPanel(): void {
  const now = new Date();
  const active = useOwner ? OWNER.zone : DEVICE_ZONE;
  panel.date.textContent = `Today, ${shortDate(active, now)}`;
  panel.apart.textContent = apartLabel(offsetMinutes(DEVICE_ZONE, now), offsetMinutes(OWNER.zone, now));

  panel.you.node.style.left = `${dayPercent(DEVICE_ZONE, now)}%`;
  panel.owner.node.style.left = `${dayPercent(OWNER.zone, now)}%`;

  panel.youTile.title.textContent = "Your time";
  panel.youTile.sub.textContent = `${formatClock(DEVICE_ZONE, now)} · ${cityName(DEVICE_ZONE)}`;
  panel.ownerTile.title.textContent = `${OWNER.name} time`;
  panel.ownerTile.sub.textContent = `${formatClock(OWNER.zone, now)} · ${OWNER.city}`;
  panel.youTile.btn.setAttribute("aria-pressed", String(!useOwner));
  panel.ownerTile.btn.setAttribute("aria-pressed", String(useOwner));
}

function paintClock(): void {
  $("clock-time").textContent = formatClock(timeZone);
  paintPanel();
}

function saveZone(): void {
  try {
    if (useOwner) localStorage.setItem("tz", "owner");
    else localStorage.removeItem("tz");
  } catch {
    /* storage unavailable */
  }
}

// Re-read the active zone, repaint, and re-format any dates already on screen.
function refreshZone(): void {
  timeZone = useOwner ? OWNER.zone : undefined;
  paintClock();
  if (lastReport) render(lastReport, { scroll: false });
}

function setActive(forOwner: boolean): void {
  useOwner = forOwner;
  saveZone();
  refreshZone();
}

try {
  // Any value saved by an earlier version also meant "the other zone was selected".
  useOwner = localStorage.getItem("tz") !== null;
} catch {
  /* storage unavailable */
}
timeZone = useOwner ? OWNER.zone : undefined;
paintClock();
setInterval(paintClock, 15000);

// ---- header: open / close menus ----

// The "click me" note goes away for good after the first click.
const hint = document.getElementById("hint");
function dismissHint(): void {
  hint?.remove();
  try {
    localStorage.setItem("hintSeen", "1");
  } catch {
    /* storage unavailable */
  }
}
try {
  if (localStorage.getItem("hintSeen")) hint?.remove();
} catch {
  /* storage unavailable */
}

// Menus open toward the page's inside; if one would leave the screen, flip it.
function keepOnScreen(menu: HTMLElement): void {
  menu.style.left = menu.style.right = "";
  const r = menu.getBoundingClientRect();
  if (r.left < 8) {
    menu.style.left = "0";
    menu.style.right = "auto";
  } else if (r.right > window.innerWidth - 8) {
    menu.style.left = "auto";
    menu.style.right = "0";
  }
}

function closeMenus(): void {
  palette.hidden = zonesBox.hidden = true;
  identityBtn.setAttribute("aria-expanded", "false");
  clockBtn.setAttribute("aria-expanded", "false");
}

function toggle(menu: HTMLElement, button: HTMLButtonElement): void {
  const open = menu.hidden;
  closeMenus();
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  if (open && menu === zonesBox) paintClock();
  if (open) keepOnScreen(menu);
}

identityBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dismissHint();
  toggle(palette, identityBtn);
});
clockBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggle(zonesBox, clockBtn);
});
document.addEventListener("click", (e) => {
  if (!(e.target as Element).closest(".menu-wrap")) closeMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenus();
});
