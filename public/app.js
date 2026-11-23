// client/time.ts
function wallClock(zone, now = /* @__PURE__ */ new Date()) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(now)) {
    parts[p.type] = p.value;
  }
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    hour,
    minute,
    asUtcMs: Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      minute,
      Number(parts.second)
    )
  };
}
function offsetMinutes(zone, now = /* @__PURE__ */ new Date()) {
  const wholeSecondMs = Math.floor(now.getTime() / 1e3) * 1e3;
  return Math.round((wallClock(zone, now).asUtcMs - wholeSecondMs) / 6e4);
}
function dayPercent(zone, now = /* @__PURE__ */ new Date()) {
  const w = wallClock(zone, now);
  return (w.hour * 60 + w.minute) / 1440 * 100;
}
function formatClock(zone, now = /* @__PURE__ */ new Date()) {
  return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: zone }).replace(" ", "");
}
function shortDate(zone, now = /* @__PURE__ */ new Date()) {
  return now.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: zone });
}
function apartLabel(offsetA, offsetB) {
  const diff = Math.abs(offsetA - offsetB);
  if (diff === 0) return "Same time";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h ? `${h}h` : ""}${h && m ? " " : ""}${m ? `${m}m` : ""} apart`;
}
function cityName(zone) {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

// client/app.ts
var OWNER = { name: "Precious", city: "Ekiti", zone: "Africa/Lagos" };
var DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== void 0) node.textContent = text;
  return node;
}
var input = $("file-input");
var dropTitle = $("drop-title");
var statusLine = $("status");
var result = $("result");
var maxBytes = 25 * 1024 * 1024;
fetch("/api/limits").then((r) => r.json()).then(({ maxMb }) => {
  maxBytes = maxMb * 1024 * 1024;
  const hint2 = $("drop-hint");
  hint2.textContent = (hint2.textContent ?? "").replace(/up to \d+ MB/, `up to ${maxMb} MB`);
}).catch(() => {
});
var FIELD_LABELS = {
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
  c2paValidationIssues: "Validation notes"
};
var timeZone;
var lastReport = null;
function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.className = isError ? "status error" : "status";
  statusLine.hidden = !message;
}
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(void 0, { dateStyle: "medium", timeStyle: "short", timeZone });
}
function formatValue(key, value) {
  if (key === "c2paPresent") return value ? "Present" : "None found";
  if (key.endsWith("At") && typeof value === "string") return formatDate(value);
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}
function listItem(text, code) {
  const li = make("li");
  li.append(text);
  if (code) li.append(make("code", void 0, code));
  return li;
}
function emptyItem(tag, text) {
  return make(tag, "empty", text);
}
function renderSummary(summary, verdict) {
  const s = summary ?? { status: verdict, tone: "", tool: null, provider: null, model: null, createdAt: null };
  $("dot").className = `dot ${s.tone}`;
  $("s-status").textContent = s.status;
  const by = $("s-by");
  const date = $("s-date");
  const found = verdict === "ai-signature-found";
  by.hidden = date.hidden = !found;
  if (!found) return;
  const name = make("span", "acc", s.tool || s.provider || "an AI tool (name not stated)");
  const company = s.tool && s.provider ? ` (${s.provider})` : "";
  by.replaceChildren("By ", name, `${company} \xB7 Model ${s.model || "not stated"}`);
  date.textContent = s.createdAt ? `Created ${formatDate(s.createdAt)}` : "Creation date not recorded";
}
function render(report, { scroll = true } = {}) {
  lastReport = report;
  renderSummary(report.summary, report.verdict);
  $("result-file").textContent = report.file || "";
  const signals = $("signals");
  signals.replaceChildren();
  if (report.signals.length) {
    for (const s of report.signals) {
      const times = s.count && s.count > 1 ? ` \xD7${s.count}` : "";
      const field = s.field.replace(/urn:c2pa:[0-9a-f-]+/g, "manifest");
      signals.append(listItem(`"${s.match}"${times} in ${s.source}`, field));
    }
  } else {
    signals.append(emptyItem("li", "None found."));
  }
  const fields = $("fields");
  fields.replaceChildren();
  const entries = Object.entries(report.fields).filter(([, v]) => v !== null && v !== void 0);
  if (entries.length === 0) fields.append(emptyItem("div", "No details found."));
  for (const [key, value] of entries) {
    const row = make("div", "row");
    row.append(make("dt", void 0, FIELD_LABELS[key] ?? key), make("dd", void 0, formatValue(key, value)));
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
var busy = false;
async function check(file) {
  if (!file || busy) return;
  if (file.size > maxBytes) {
    const mb = (n) => (n / 1024 / 1024).toFixed(1);
    setStatus(`That file is ${mb(file.size)} MB. The limit here is ${mb(maxBytes)} MB.`, true);
    input.value = "";
    return;
  }
  busy = true;
  dropTitle.textContent = file.name;
  setStatus("Checking\u2026");
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
    if (!res.ok) {
      const message = data.error;
      throw new Error(message || `Request failed (${res.status})`);
    }
    setStatus("");
    render(data);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    busy = false;
    input.value = "";
  }
}
input.addEventListener("change", () => void check(input.files?.[0]));
document.querySelectorAll("[data-sample]").forEach(
  (btn) => btn.addEventListener("click", async () => {
    if (busy) return;
    const url = btn.dataset.sample ?? "";
    try {
      setStatus("Loading sample\u2026");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Couldn't load the sample (${res.status})`);
      const blob = await res.blob();
      await check(new File([blob], url.split("/").pop() ?? "sample", { type: blob.type }));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
  })
);
var dragDepth = 0;
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
var themeButtons = document.querySelectorAll("[data-theme-choice]");
function currentChoice() {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}
function paintTheme() {
  const choice = currentChoice();
  themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)));
}
themeButtons.forEach(
  (b) => b.addEventListener("click", () => {
    const choice = b.dataset.themeChoice;
    if (choice === "light" || choice === "dark") document.documentElement.dataset.theme = choice;
    else delete document.documentElement.dataset.theme;
    try {
      if (choice === "light" || choice === "dark") localStorage.setItem("theme", choice);
      else localStorage.removeItem("theme");
    } catch {
    }
    paintTheme();
  })
);
paintTheme();
var SWATCHES = [
  ["Neutral", "neutral"],
  ["Blue", "#3b4bd6"],
  ["Green", "#4a8a3c"],
  ["Orange", "#b86e28"],
  ["Red", "#c4492f"],
  ["Purple", "#7b4fd0"],
  ["Pink", "#b94787"],
  ["Teal", "#347f7a"],
  ["Sky", "#3b7fbf"],
  ["Brown", "#7c5538"]
];
var identityBtn = $("identity-btn");
var palette = $("palette");
var clockBtn = $("clock-btn");
var zonesBox = $("zones");
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
  palette.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === value)));
  try {
    if (value === "neutral") localStorage.removeItem("accent");
    else localStorage.setItem("accent", value);
  } catch {
  }
}
for (const [name, value] of SWATCHES) {
  const b = make("button", "swatch");
  b.type = "button";
  b.dataset.color = value;
  b.setAttribute("aria-label", name);
  b.setAttribute("aria-pressed", "false");
  b.style.setProperty("--swatch", value === "neutral" ? "var(--text)" : value);
  b.addEventListener("click", () => {
    applyAccent(value);
    dismissHint();
  });
  palette.append(b);
}
applyAccent(savedAccent());
var useOwner = false;
function marker(label, side) {
  const node = make("span", `tz-marker ${side}`);
  const text = make("span", "tz-label", label);
  node.append(text);
  return { node, text };
}
function tile(forOwner) {
  const btn = make("button", "tz-tile");
  btn.type = "button";
  const title = make("span", "tz-title");
  const sub = make("span", "tz-sub");
  btn.append(title, sub);
  btn.addEventListener("click", () => setActive(forOwner));
  return { btn, title, sub };
}
function buildPanel() {
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
  for (const h of ["12AM", "6AM", "12PM", "6PM", "12AM"]) hours.append(make("span", void 0, h));
  const youTile = tile(false);
  const ownerTile = tile(true);
  const tiles = make("div", "tz-tiles");
  tiles.append(youTile.btn, ownerTile.btn);
  zonesBox.append(head, track, hours, tiles);
  return { date, apart, you, owner, youTile, ownerTile };
}
var panel = buildPanel();
function paintPanel() {
  const now = /* @__PURE__ */ new Date();
  const active = useOwner ? OWNER.zone : DEVICE_ZONE;
  panel.date.textContent = `Today, ${shortDate(active, now)}`;
  panel.apart.textContent = apartLabel(offsetMinutes(DEVICE_ZONE, now), offsetMinutes(OWNER.zone, now));
  panel.you.node.style.left = `${dayPercent(DEVICE_ZONE, now)}%`;
  panel.owner.node.style.left = `${dayPercent(OWNER.zone, now)}%`;
  panel.youTile.title.textContent = "Your time";
  panel.youTile.sub.textContent = `${formatClock(DEVICE_ZONE, now)} \xB7 ${cityName(DEVICE_ZONE)}`;
  panel.ownerTile.title.textContent = `${OWNER.name} time`;
  panel.ownerTile.sub.textContent = `${formatClock(OWNER.zone, now)} \xB7 ${OWNER.city}`;
  panel.youTile.btn.setAttribute("aria-pressed", String(!useOwner));
  panel.ownerTile.btn.setAttribute("aria-pressed", String(useOwner));
}
function paintClock() {
  $("clock-time").textContent = formatClock(timeZone);
  paintPanel();
}
function saveZone() {
  try {
    if (useOwner) localStorage.setItem("tz", "owner");
    else localStorage.removeItem("tz");
  } catch {
  }
}
function refreshZone() {
  timeZone = useOwner ? OWNER.zone : void 0;
  paintClock();
  if (lastReport) render(lastReport, { scroll: false });
}
function setActive(forOwner) {
  useOwner = forOwner;
  saveZone();
  refreshZone();
}
try {
  useOwner = localStorage.getItem("tz") !== null;
} catch {
}
timeZone = useOwner ? OWNER.zone : void 0;
paintClock();
setInterval(paintClock, 15e3);
var hint = document.getElementById("hint");
function dismissHint() {
  hint?.remove();
  try {
    localStorage.setItem("hintSeen", "1");
  } catch {
  }
}
try {
  if (new URLSearchParams(location.search).has("hint")) localStorage.removeItem("hintSeen");
  else if (localStorage.getItem("hintSeen")) hint?.remove();
} catch {
}
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
identityBtn.addEventListener("click", (e) => {
  e.stopPropagation();
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
