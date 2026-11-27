// node_modules/apreez-profile-widget/dist/index.js
var PROFILE_ASCII = "          ###%%%%@%***\n       ####%%*-..:+##*+=#\n    #**###%%-...--::##+=#%%#\n   %%%%%%%@# -:-+=+:=%*+%@%%%\n  *******##+-:::+::=+%**######\n --------=+-:=+-+**=+++==------\n=++++++++++*=.::=-:=#***++++++++\n==+++++***+=*-  ::=%--+******+++\n=-=***+--.  +%+.:+%#    ..:=**++\n=-=+#-  ........:.:..:::... :#*+\n =-+-  :-:---..:=-.::-=-:..: **\n  ==   :-:---:.-=-::--=-::...*\n   +.  .-::--..-=--::----:. .\n    .  .:::::..---::-::--:\n       .::::..:--:.:=::--\n          ::..:--:.--.";
var PROFILE = {
  name: "Precious Adedokun",
  handle: "@apreezofficial",
  role: "Full-stack software engineer",
  bio: "I build open-source softwares and random shis on rainy days.",
  website: "https://preciousadedokun.com.ng",
  links: [
    { label: "GitHub", url: "https://github.com/apreezofficial", icon: "github" },
    { label: "X", url: "https://x.com/exdeveloper__", icon: "x" },
    { label: "LinkedIn", url: "https://ng.linkedin.com/in/precious-adedokun-b58221350", icon: "linkedin" },
    { label: "Website", url: "https://preciousadedokun.com.ng", icon: "globe" }
  ],
  profileUrl: "https://preciousadedokun.com.ng"
};
var PROJECTS = [
  { id: "voieform", name: "Voieform", url: "https://voieform.com" },
  { id: "iwasadev", name: "I Was a Dev", url: "https://iwasadev.xyz" },
  { id: "datum", name: "Datum", url: "https://datum.pxxl.dev" },
  { id: "aidetector", name: "AI Detector", url: "https://aidetector.apcodesphere.xyz/" },
  { id: "uselessass", name: "UselessAss", url: "https://uselessass.xyz/" },
  { id: "spoweb", name: "Spoweb", url: "https://spoweb.apcodesphere.xyz/" },
  { id: "apanalytics", name: "APAnalytics", url: "https://apanlytics.preciousadedokun.com.ng/" },
  { id: "zeroth", name: "Zeroth", url: "https://zeroth.apcodesphere.xyz" },
  { id: "kureva", name: "Kureva", url: "https://kureva.pxxl.dev" },
  { id: "devdrawer", name: "DevDrawer", url: "https://devdrawer.xyz" }
];
var ICONS = {
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
  x: '<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.4L1.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-7h3a3 3 0 0 1 3 3v4M12 13a3 3 0 0 1 3-3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>'
};
var CSS = `
.dock{position:fixed;z-index:2147483000;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:min(390px,calc(100vw - 24px));display:flex;flex-direction:column;align-items:flex-end;pointer-events:none}
.panel{zoom:.65;width:min(390px,calc((100vw - 24px) / .65));padding-bottom:8px;pointer-events:auto}.panel[hidden]{display:none}
.dock .card{width:100%;max-height:min(660px,calc((100dvh - 84px) / .65));border-radius:22px}
.profile-art{margin:0;flex:none;color:#e0abec;font:3px/1 monospace;letter-spacing:0;text-align:center}
.trigger{display:flex;align-items:center;gap:10px;max-width:100%;padding:8px 13px 8px 8px;border:1px solid #594665;border-radius:18px;background:#170f1d;color:#c7b1d3;font:inherit;font-size:14px;cursor:pointer;pointer-events:auto;box-shadow:0 8px 30px #08050b38;text-align:left}
.trigger-art{font-size:1.7px;border:1px solid #e879f9;border-radius:9px;padding:3px}.trigger img{width:32px;height:32px;object-fit:cover;border-radius:50%;border:2px solid #e879f9}.trigger strong{color:#f0a4fa}.trigger:focus-visible{outline:2px solid #e879f9;outline-offset:2px}.chevron{margin-left:4px}.trigger[aria-expanded="true"] .chevron{transform:rotate(180deg)}

:host{display:block;max-width:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f4edf9;line-height:1.45}
*{box-sizing:border-box}
.card{--accent:var(--apw-accent,#e879f9);position:relative;isolation:isolate;display:flex;flex-direction:column;width:min(100%,560px);max-height:min(900px,100vh);overflow:hidden;border:1px solid #43344c;border-radius:32px;background:#170f1d;box-shadow:0 24px 60px #08050b38}
.card:before{position:absolute;z-index:-1;inset:-80px -50px 0;content:"";opacity:.48;background:repeating-linear-gradient(104deg,transparent 0 38px,#493650 39px,#493650 40px,transparent 41px 74px);mask-image:linear-gradient(#000 0%,transparent 75%)}
.content{padding:28px 28px 0;overflow:auto;scrollbar-width:thin;scrollbar-color:#493650 transparent}
.person{display:flex;align-items:center;gap:16px;min-width:0}
.avatar{width:74px;height:74px;flex:none;border-radius:50%;object-fit:cover;background:#32263a;border:1px solid #594665}
.identity{min-width:0}.name{margin:0;font-size:25px;font-weight:750;letter-spacing:-.035em;line-height:1.15}.role{margin:5px 0 0;color:#d4c2dc;font-size:16px}.handle{margin:3px 0 0;color:#b8a3c2;font-size:15px;overflow-wrap:anywhere}
.bio{margin:24px 0 20px;color:#d1c2d8;font-size:19px;line-height:1.55;white-space:pre-wrap}
.socials{display:flex;flex-wrap:wrap;gap:10px}.social{display:grid;place-items:center;width:62px;height:62px;border:1px solid #32253a;border-radius:18px;background:#24192b;color:#f5eafa;text-decoration:none;transition:transform .18s ease,border-color .18s ease,background .18s ease}.social:hover{transform:translateY(-3px);border-color:#6f527a;background:#302138}.social svg,.project-link svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.social[data-icon="x"] svg,.social[data-icon="github"] svg{fill:currentColor;stroke:none}
.feature{margin-top:22px;padding:16px;border:1px solid #392b42;border-radius:22px;background:#201626}.feature-label,.section-label{color:#b9a3c3;font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.feature-image{display:block;width:100%;height:150px;margin:12px 0 14px;border-radius:14px;object-fit:cover;background:#302238}.feature-title{margin:10px 0 4px;font-size:21px;font-weight:750;letter-spacing:-.02em}.feature-description{margin:0 0 12px;color:#baa7c2;font-size:15px}.feature-actions{display:flex;gap:10px;flex-wrap:wrap}.feature-actions a{color:#f0b2fa;font-size:14px;font-weight:700;text-decoration:none}.feature-actions a:hover{text-decoration:underline}
.projects-note{margin:0 0 12px;color:#d1c2d8;font-size:14px}.portfolio-link{color:#f0a4fa}.projects{margin-top:26px;padding-top:22px;border-top:1px solid #44354b}.section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.section-label{margin:0}.count{color:#b9a3c3;font-size:14px;font-weight:750}.project{display:flex;align-items:center;gap:14px;padding:10px 0;color:inherit;text-decoration:none;min-width:0}.project:hover .project-name{color:#f0b2fa}.project-image{width:58px;height:58px;flex:none;border-radius:15px;object-fit:cover;background:#32263a}.project-placeholder{display:grid;place-items:center;color:#f0b2fa;font-size:23px;font-weight:800}.project-copy{min-width:0;flex:1}.project-name{display:block;overflow:hidden;color:#f5edf9;font-size:18px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.project-description{display:block;overflow:hidden;margin-top:2px;color:#b9a6c1;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.project-link{color:#a995b3}.project-link svg{width:20px;height:20px}
.footer{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:15px 28px;border-top:1px solid #44354b;background:#170f1df2;backdrop-filter:blur(12px)}.all{color:#f0a4fa;font-weight:750;text-decoration:none}.all:hover{text-decoration:underline}.made{display:flex;align-items:center;gap:8px;color:#b9a6c1;font-size:14px;text-decoration:none;white-space:nowrap}.made img{width:22px;height:22px;border-radius:50%}.empty{padding:16px;color:#b9a6c1;font-size:14px}
@media(max-width:440px){.card{border-radius:24px}.content{padding:20px 18px 0}.avatar{width:62px;height:62px}.name{font-size:21px}.handle{font-size:15px}.bio{font-size:17px;margin:20px 0 16px}.social{width:54px;height:54px;border-radius:16px}.project-image{width:50px;height:50px}.project-name{font-size:16px}.project-description{font-size:13px}.footer{padding:13px 18px}}
`;
function safeUrl(value) {
  if (typeof value !== "string" || !value.trim())
    return "";
  try {
    const url = new URL(value, globalThis.location?.href || "https://example.com");
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className)
    element.className = className;
  if (text != null)
    element.textContent = String(text);
  return element;
}
function externalLink(url, label, className) {
  const link = node("a", className, label);
  link.href = safeUrl(url) || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICONS[name] || ICONS.globe;
  return svg;
}
function normalizeProjects(value) {
  const projects = Array.isArray(value) ? value : PROJECTS;
  return projects.filter((project) => project && project.name && safeUrl(project.url)).map((project, index) => ({
    id: String(project.id ?? index + 1),
    name: String(project.name),
    description: String(project.description ?? ""),
    url: safeUrl(project.url),
    image: safeUrl(project.image),
    source: safeUrl(project.source ?? project.githubUrl)
  }));
}
function pickProject(projects, choice) {
  if (typeof choice === "number" && Number.isInteger(choice))
    return projects[choice - 1] || null;
  if (typeof choice === "string" && choice.trim()) {
    const normalized = choice.trim().toLowerCase();
    return projects.find((project) => project.id.toLowerCase() === normalized || project.name.toLowerCase() === normalized) || null;
  }
  return null;
}
function buildCard(shadow, options) {
  const profile = { ...PROFILE, ...options.profile || {} };
  const projects = normalizeProjects(options.projects);
  const current = pickProject(projects, options.project);
  const currentUrl = safeUrl(options.currenturl ?? new URLSearchParams(location.search).get("currenturl") ?? location.href);
  const site = (url) => url ? new URL(url).hostname.replace(/^www\./, "") : "";
  const visibleProjects = projects.filter((project) => project.id !== current?.id && site(project.url) !== site(currentUrl));
  shadow.replaceChildren();
  const style = node("style");
  style.textContent = CSS;
  shadow.append(style);
  const card = node("article", "card");
  card.setAttribute("aria-label", `${profile.name || PROFILE.name} profile card`);
  if (options.accent)
    card.style.setProperty("--apw-accent", String(options.accent));
  const content = node("div", "content");
  const person = node("div", "person");
  if (safeUrl(profile.avatar)) {
    const avatar = node("img", "avatar");
    avatar.src = safeUrl(profile.avatar);
    avatar.alt = `${profile.name || PROFILE.name} profile photo`;
    avatar.loading = "lazy";
    person.append(avatar);
  }
  const photo = person.querySelector("img")?.cloneNode();
  if (!options.profile?.avatar) {
    const art = node("pre", "profile-art", PROFILE_ASCII);
    art.setAttribute("aria-hidden", "true");
    person.replaceChildren(art);
  }
  const identity = node("div", "identity");
  identity.append(node("h2", "name", profile.name || PROFILE.name));
  if (profile.role)
    identity.append(node("p", "role", profile.role));
  if (profile.handle)
    identity.append(node("p", "handle", profile.handle));
  person.append(identity);
  content.append(person);
  if (profile.bio)
    content.append(node("p", "bio", profile.bio));
  const socials = node("nav", "socials");
  socials.setAttribute("aria-label", "Profile links");
  for (const link of Array.isArray(profile.links) ? profile.links : []) {
    const href = safeUrl(link.url);
    if (!href)
      continue;
    const anchor = externalLink(href, "", "social");
    const iconName = link.icon && Object.hasOwn(ICONS, link.icon) ? link.icon : "globe";
    anchor.dataset.icon = iconName;
    anchor.setAttribute("aria-label", link.label || iconName);
    anchor.title = link.label || iconName;
    anchor.append(icon(iconName));
    socials.append(anchor);
  }
  if (socials.childElementCount)
    content.append(socials);
  const section = node("section", "projects");
  const header = node("div", "section-head");
  header.append(node("h3", "section-label", "Also shipped"));
  header.append(node("span", "count", String(visibleProjects.length)));
  section.append(header);
  if (!options.projects) {
    const note = node("p", "projects-note", "Side quest projects I made for fun. For my real-world projects, check ");
    note.append(externalLink(PROFILE.website, "my portfolio \u2197", "portfolio-link"));
    section.append(note);
  }
  if (visibleProjects.length) {
    for (const project of visibleProjects) {
      const row = externalLink(project.url, "", "project");
      const copy = node("span", "project-copy");
      copy.append(node("span", "project-name", project.name));
      if (project.description)
        copy.append(node("span", "project-description", project.description));
      row.append(copy);
      const outbound = node("span", "project-link");
      outbound.append(icon("arrow"));
      row.append(outbound);
      section.append(row);
    }
  } else {
    section.append(node("p", "empty", "More shipped projects are coming soon."));
  }
  content.append(section);
  card.append(content);
  const footer = node("footer", "footer");
  const profileUrl = safeUrl(profile.profileUrl || profile.website);
  if (profileUrl)
    footer.append(externalLink(profileUrl, "See everything \u2192", "all"));
  if (profile.website) {
    const made = externalLink(profile.website, "", "made");
    made.append(document.createTextNode("Made by "), node("strong", "", profile.name || PROFILE.name));
    footer.append(made);
  }
  card.append(footer);
  const dock = node("div", "dock");
  const panel2 = node("div", "panel");
  panel2.id = "profile-panel";
  panel2.hidden = true;
  panel2.append(card);
  const trigger = node("button", "trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-controls", panel2.id);
  trigger.setAttribute("aria-expanded", "false");
  if (photo instanceof HTMLImageElement) {
    photo.alt = "";
    trigger.append(photo);
  } else {
    const art = node("pre", "profile-art trigger-art", PROFILE_ASCII);
    art.setAttribute("aria-hidden", "true");
    trigger.append(art);
  }
  const label = node("span", "trigger-label", "Created by ");
  label.append(node("strong", "", options.profile?.name || "Apcodesphere"));
  const chevron = node("span", "chevron", "\u2303");
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(label, chevron);
  const show = (open) => {
    panel2.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  };
  let pinned = false;
  dock.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse")
      show(true);
  });
  dock.addEventListener("pointerleave", () => {
    if (!pinned && !dock.matches(":focus-within"))
      show(false);
  });
  trigger.addEventListener("click", () => {
    pinned = !pinned;
    show(pinned);
  });
  dock.addEventListener("focusout", (event) => {
    if (!(event.relatedTarget instanceof Node && dock.contains(event.relatedTarget))) {
      pinned = false;
      show(false);
    }
  });
  dock.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel2.hidden) {
      pinned = false;
      trigger.focus();
      show(false);
    }
  });
  dock.append(panel2, trigger);
  shadow.append(dock);
  return card;
}
function mountProfileWidget(options = {}) {
  if (typeof document === "undefined")
    throw new Error("The profile widget can only be mounted in a browser.");
  const target = typeof options.target === "string" ? document.querySelector(options.target) : options.target instanceof Element ? options.target : null;
  const host = target || document.createElement("div");
  if (!target) {
    host.id = options.id || "apreez-profile-widget";
    document.body.append(host);
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  let current = { ...options };
  buildCard(shadow, current);
  return {
    element: host,
    update(nextOptions = {}) {
      current = { ...current, ...nextOptions };
      buildCard(shadow, current);
    },
    destroy() {
      if (!target)
        host.remove();
      else
        shadow.replaceChildren();
    }
  };
}

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
  const node2 = document.createElement(tag);
  if (className) node2.className = className;
  if (text !== void 0) node2.textContent = text;
  return node2;
}
var input = $("file-input");
var dropTitle = $("drop-title");
var statusLine = $("status");
var result = $("result");
var maxBytes = 25 * 1024 * 1024;
fetch("/api/limits").then((r) => r.json()).then(({ maxMb, openAiVerificationEnabled }) => {
  maxBytes = maxMb * 1024 * 1024;
  const hint = $("drop-hint");
  hint.textContent = (hint.textContent ?? "").replace(/up to \d+ MB/, `up to ${maxMb} MB`);
  if (openAiVerificationEnabled === false) {
    $("privacy-copy").textContent = "Files are inspected on this server and deleted right after. Pixel watermark checks are not enabled on this server.";
  } else if (openAiVerificationEnabled === true) {
    $("privacy-copy").textContent = "Files are deleted after checking. Supported images are also sent to OpenAI for its provenance check.";
  }
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
  c2paValidationIssues: "Validation notes",
  openAiSynthId: "OpenAI SynthID watermark",
  openAiProvenanceC2pa: "OpenAI API Content Credentials",
  openAiC2paValidation: "OpenAI API credential validation",
  openAiC2paIssuer: "OpenAI API credential issuer",
  openAiC2paModel: "OpenAI API model",
  openAiC2paGeneratedAt: "OpenAI API creation date"
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
  });
  palette.append(b);
}
applyAccent(savedAccent());
var useOwner = false;
function marker(label, side) {
  const node2 = make("span", `tz-marker ${side}`);
  const text = make("span", "tz-label", label);
  node2.append(text);
  return { node: node2, text };
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
var drawerOptions = {
  currenturl: "https://aidetector.apcodesphere.xyz"
};
mountProfileWidget(drawerOptions);
