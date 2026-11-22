// Client script of the Home page. It builds every node with textContent, so project names, branches
// and file paths from the host can never become markup.
const SCRIPT = `
const vscode = acquireVsCodeApi();
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
let model = null;

function ago(ms) {
  if (!ms) return "no changes";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  return Math.round(s / 86400) + "d ago";
}
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
const openProject = (root) => vscode.postMessage({ type: "open", root });
const openFile = (root, file) => vscode.postMessage({ type: "openFile", root, path: file });

function meta(p) {
  const bits = [];
  if (p.branch) bits.push(p.branch);
  bits.push(plural(p.changed, "changed file"));
  bits.push(p.lastChange ? "last change " + ago(p.lastChange) : "no uncommitted changes");
  return bits.join("  ·  ");
}

function card(p) {
  const c = el("div", "card");
  const head = el("div", "head");
  const name = el("span", "name", p.name); name.title = p.root;
  const btn = el("button", null, "Open"); btn.addEventListener("click", () => openProject(p.root));
  head.append(name, btn);
  c.append(head, el("div", "meta", meta(p)));
  if (p.added) c.append(el("div", "meta", p.added.how + " " + ago(p.added.at)));
  const ss = el("div", "sessions");
  if (!p.sessions.length) ss.append(el("span", "muted", "no Claude session"));
  for (const s of p.sessions) {
    const chip = el("span", "chip " + (s.state === "working" ? "busy" : s.state === "idle" ? "idle" : ""));
    chip.append(el("span", "dot"), document.createTextNode(s.name + "  " + s.state));
    ss.append(chip);
  }
  c.append(ss);
  if (p.files.length) {
    const ul = el("ul", "files");
    for (const f of p.files) {
      const li = el("li");
      const a = el("a", null, f.rel); a.href = "#"; a.title = f.path;
      a.addEventListener("click", (e) => { e.preventDefault(); openFile(p.root, f.path); });
      li.append(a, el("span", "when", ago(f.mtime)));
      ul.append(li);
    }
    c.append(ul);
  }
  return c;
}

function row(p) {
  const r = el("button", "row"); r.title = p.root;
  const busy = p.sessions.filter((s) => s.state === "working").length;
  r.append(el("span", "name", p.name), el("span", "muted", [p.branch || "no git", p.changed ? p.changed + " changed" : "",
    p.sessions.length ? plural(p.sessions.length, "session") + (busy ? " (" + busy + " working)" : "") : "", p.lastChange ? ago(p.lastChange) : ""]
    .filter(Boolean).join("  ·  ")));
  r.addEventListener("click", () => openProject(p.root));
  return r;
}

function section(id, title, list, make) {
  const box = $(id); box.replaceChildren();
  if (!list.length) { box.hidden = true; return; }
  box.hidden = false;
  box.append(el("h3", null, title));
  for (const p of list) box.append(make(p));
}

function draw() {
  if (!model) return;
  section("working", "Being worked on now", model.working, card);
  section("recent", "Recently added", model.recent, card);
  $("none").hidden = model.working.length + model.recent.length > 0;
  const all = $("all"); all.replaceChildren();
  for (const p of model.all) all.append(row(p));
  $("updated").textContent = "updated " + new Date(model.now).toLocaleTimeString();
}

window.addEventListener("message", ({ data }) => { if (data && data.type === "model") { model = data.model; draw(); } });
$("reload").addEventListener("click", () => vscode.postMessage({ type: "refresh" }));
vscode.postMessage({ type: "ready" });
`;

module.exports = { SCRIPT };
