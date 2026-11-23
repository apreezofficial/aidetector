const input = document.getElementById("file-input");
const dropTitle = document.getElementById("drop-title");
const status = document.getElementById("status");
const result = document.getElementById("result");

// Friendly names for the raw field keys in "Full details".
const FIELD_LABELS = {
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
function setStatus(message, isError = false) {
  status.textContent = message;
  status.className = isError ? "status error" : "status";
  status.hidden = !message;
}

// Selected time zone (an IANA name, or undefined for the device's own).
let timeZone;
let lastReport = null;

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone });
}

function formatValue(key, value) {
  if (key === "c2paPresent") return value ? "Present" : "None found";
  if (/(At)$/.test(key) && typeof value === "string") return formatDate(value);
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

function listItem(text, code) {
  const li = document.createElement("li");
  li.append(text);
  if (code) {
    const c = document.createElement("code");
    c.textContent = code;
    li.append(c);
  }
  return li;
}

function emptyItem(tag, text) {
  const el = document.createElement(tag);
  el.className = "empty";
  el.textContent = text;
  return el;
}

// ---- rendering ----
function renderSummary(summary, verdict) {
  const s = summary || { status: verdict, tone: "" };
  document.getElementById("dot").className = `dot ${s.tone || ""}`;
  document.getElementById("s-status").textContent = s.status;

  const by = document.getElementById("s-by");
  const date = document.getElementById("s-date");
  const found = verdict === "ai-signature-found";
  by.hidden = date.hidden = !found;
  if (!found) return;

  // Line 2: which AI, then which model.
  const name = document.createElement("span");
  name.className = "acc";
  name.textContent = s.tool || s.provider || "an AI tool (name not stated)";
  const company = s.tool && s.provider ? ` (${s.provider})` : "";
  by.replaceChildren("By ", name, `${company} · Model ${s.model || "not stated"}`);

  // Line 3: when it was made.
  date.textContent = s.createdAt ? `Created ${formatDate(s.createdAt)}` : "Creation date not recorded";
}

function render(report, { scroll = true } = {}) {
  lastReport = report;
  renderSummary(report.summary, report.verdict);
  document.getElementById("result-file").textContent = report.file || "";

  const signals = document.getElementById("signals");
  signals.replaceChildren();
  if (report.signals?.length) {
    for (const s of report.signals) {
      const times = s.count > 1 ? ` ×${s.count}` : "";
      const field = String(s.field).replace(/urn:c2pa:[0-9a-f-]+/g, "manifest");
      signals.append(listItem(`"${s.match}"${times} in ${s.source}`, field));
    }
  } else {
    signals.append(emptyItem("li", "None found."));
  }

  const fields = document.getElementById("fields");
  fields.replaceChildren();
  const entries = Object.entries(report.fields || {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) fields.append(emptyItem("div", "No details found."));
  for (const [key, value] of entries) {
    const row = document.createElement("div");
    row.className = "row";
    const dt = document.createElement("dt");
    dt.textContent = FIELD_LABELS[key] || key;
    const dd = document.createElement("dd");
    dd.textContent = formatValue(key, value);
    row.append(dt, dd);
    fields.append(row);
  }

  const notes = document.getElementById("notes");
  notes.replaceChildren();
  document.getElementById("notes-block").hidden = !report.notes?.length;
  for (const n of report.notes || []) notes.append(listItem(n));

  document.getElementById("disclaimer").textContent = report.disclaimer || "";
  result.hidden = false;
  if (scroll) result.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- upload ----
let busy = false;

async function check(file) {
  if (!file || busy) return;
  busy = true;
  dropTitle.textContent = file.name;
  setStatus("Checking…");
  result.hidden = true;
  try {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/inspect", { method: "POST", body });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned an unexpected response (${res.status})`);
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    setStatus("");
    render(data);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    busy = false;
    input.value = ""; // lets the same file be picked again
  }
}

input.addEventListener("change", () => check(input.files[0]));

// "Try a sample": fetch the bundled file and run it through the same path as an upload.
document.querySelectorAll("[data-sample]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    if (busy) return;
    const url = btn.dataset.sample;
    try {
      setStatus("Loading sample…");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Couldn't load the sample (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], url.split("/").pop(), { type: blob.type });
      await check(file);
    } catch (err) {
      setStatus(err.message, true);
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
  const file = e.dataTransfer?.files?.[0];
  if (file) check(file);
});

// ---- theme: System / Light / Dark ----
const buttons = document.querySelectorAll("[data-theme-choice]");

function currentChoice() {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function paintTheme() {
  const choice = currentChoice();
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)));
}

buttons.forEach((b) =>
  b.addEventListener("click", () => {
    const choice = b.dataset.themeChoice;
    if (choice === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    try {
      if (choice === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", choice);
    } catch {}
    paintTheme();
  })
);
paintTheme();

// ---- header: accent colour picker ----
const SWATCHES = [
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

const identityBtn = document.getElementById("identity-btn");
const palette = document.getElementById("palette");
const clockBtn = document.getElementById("clock-btn");
const zonesBox = document.getElementById("zones");

function savedAccent() {
  try {
    return localStorage.getItem("accent") || "neutral";
  } catch {
    return "neutral";
  }
}

function applyAccent(value) {
  if (value === "neutral") document.documentElement.style.removeProperty("--accent");
  else document.documentElement.style.setProperty("--accent", value);
  palette.querySelectorAll(".swatch").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.color === value))
  );
  try {
    if (value === "neutral") localStorage.removeItem("accent");
    else localStorage.setItem("accent", value);
  } catch {}
}

for (const [name, value] of SWATCHES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "swatch";
  b.dataset.color = value;
  b.setAttribute("aria-label", name);
  b.setAttribute("aria-pressed", "false");
  b.style.setProperty("--swatch", value === "neutral" ? "var(--text)" : value);
  b.addEventListener("click", () => applyAccent(value));
  palette.append(b);
}
applyAccent(savedAccent());

// ---- header: clock and time zone ----
const ZONES = [
  ["Local time", undefined],
  ["UTC", "UTC"],
  ["Lagos", "Africa/Lagos"],
  ["London", "Europe/London"],
  ["New York", "America/New_York"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Dubai", "Asia/Dubai"],
  ["Mumbai", "Asia/Kolkata"],
  ["Tokyo", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"],
];

const clockTime = (tz) =>
  new Date()
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz })
    .replace(" ", "");

function paintClock() {
  document.getElementById("clock-time").textContent = clockTime(timeZone);
  zonesBox.querySelectorAll(".tz-time").forEach((el) => {
    el.textContent = clockTime(el.closest(".zone").dataset.tz || undefined);
  });
}

function buildZones() {
  zonesBox.replaceChildren();
  for (const [label, tz] of ZONES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "zone";
    b.setAttribute("role", "option");
    b.dataset.tz = tz || "";
    b.setAttribute("aria-selected", String(tz === timeZone));
    const name = document.createElement("span");
    name.textContent = label;
    const time = document.createElement("span");
    time.className = "tz-time";
    b.append(name, time);
    b.addEventListener("click", () => {
      timeZone = tz;
      try {
        if (tz) localStorage.setItem("tz", tz);
        else localStorage.removeItem("tz");
      } catch {}
      buildZones();
      paintClock();
      closeMenus();
      if (lastReport) render(lastReport, { scroll: false }); // re-format dates
    });
    zonesBox.append(b);
  }
}

try {
  const saved = localStorage.getItem("tz");
  if (saved && ZONES.some(([, tz]) => tz === saved)) timeZone = saved;
} catch {}
buildZones();
paintClock();
setInterval(paintClock, 15000);

// ---- header: open / close menus ----
// Menus open toward the page's inside; if one would leave the screen, flip it.
function keepOnScreen(menu) {
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

function closeMenus() {
  palette.hidden = zonesBox.hidden = true;
  identityBtn.setAttribute("aria-expanded", "false");
  clockBtn.setAttribute("aria-expanded", "false");
}

function toggle(menu, button) {
  const open = menu.hidden;
  closeMenus();
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  if (open && menu === zonesBox) paintClock();
  if (open) keepOnScreen(menu);
}

// The "click me" note goes away for good after the first click.
const hint = document.getElementById("hint");
function dismissHint() {
  hint?.remove();
  try {
    localStorage.setItem("hintSeen", "1");
  } catch {}
}
try {
  if (localStorage.getItem("hintSeen")) hint?.remove();
} catch {}

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
  if (!e.target.closest(".menu-wrap")) closeMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenus();
});
