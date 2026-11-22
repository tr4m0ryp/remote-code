// Sessions panel script: one compact row per running Claude session (Clawd state sprite, name,
// state word, last activity, uptime). A click asks the extension to open the session's terminal
// window; "+ New session" asks it to launch one. Data arrives only via postMessage.
(function () {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");
  const rows = new Map(); // pane -> { el, clawd, state, uptime, at, lastActive }
  let shownRoot = null;
  let first = true; // rows built for a freshly shown project do not turn around

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const span = (s) => (s < 60 ? "now" : s < 3600 ? Math.round(s / 60) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : Math.round(s / 86400) + "d");

  // "<state> · <activity> · up <uptime>", the state word coloured by state; a minimised window adds a
  // dimmed marker.
  function stats(r) {
    const now = Date.now();
    const ago = r.state === "working" || !r.lastActive ? "now" : span((now - r.lastActive) / 1000);
    const parts = [el("span", "word " + (r.state || "checking"), r.state || "checking"),
      document.createTextNode(" \u00b7 " + (ago === "now" ? "active now" : ago + " ago") + " \u00b7 up " + span(r.uptime + (now - r.at) / 1000))];
    if (r.window === "minimised") parts.unshift(el("span", "min", "minimised \u00b7 "));
    r.stats.replaceChildren(...parts);
  }

  function row(s) {
    const item = el("div", "row" + (s.pane ? "" : " notmux"));
    const pre = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pre.setAttribute("class", "clawd");
    const spinner = el("span", "spinner");
    const zzz = el("span", "zzz", "z");
    const name = el("span", "name", s.name);
    const text = el("div", "text");
    const line = el("div", "line");
    line.append(name, spinner);
    const st = el("div", "stats");
    text.append(line, st);
    item.append(el("div", "pet"), text);
    item.firstChild.append(pre, zzz);
    item.title = s.pane ? `Open ${s.name} (${s.tmux}) in a terminal window` : `${s.name} does not run in tmux`;
    if (s.pane) item.addEventListener("click", () => vscode.postMessage({ type: "open", pane: s.pane }));
    const r = { el: item, clawd: new Clawd(pre, spinner), state: null, uptime: s.uptime || 0, at: Date.now(), lastActive: 0, stats: st };
    r.clawd.set(first ? "idle" : "spin", "idle"); // sessions that appear later (a launch) turn around once
    stats(r);
    return r;
  }

  function header(label, project) {
    const top = el("div", "top");
    const add = el("button", null, "+ New session");
    add.disabled = !project;
    add.title = project ? "Start a new Claude session in " + project.root : "Open a project first";
    add.addEventListener("click", () => vscode.postMessage({ type: "launch" }));
    top.append(el("span", "label", label), add);
    return top;
  }

  function showProject(p) {
    const keep = new Map();
    first = !p || p.root !== shownRoot;
    shownRoot = p ? p.root : null;
    root.replaceChildren(header(p ? p.label : "Sessions", p));
    if (!p) return root.append(el("p", "empty", "Open a file in a project to see its sessions."));
    if (!p.sessions.length) root.append(el("p", "empty", "No Claude session is running in this project."));
    for (const s of p.sessions) {
      const key = s.pane || "pid" + s.name;
      let r = rows.get(key);
      if (r) r.uptime = s.uptime || 0, r.at = Date.now();
      else r = row(s);
      keep.set(key, r);
      root.append(r.el);
    }
    for (const [k, r] of rows) if (!keep.has(k)) r.clawd.clear();
    rows.clear();
    for (const [k, r] of keep) rows.set(k, r);
  }

  function status(m) {
    const r = rows.get(m.pane);
    if (!r) return;
    r.lastActive = m.lastActive;
    r.window = m.window;
    r.el.classList.toggle("minimised", m.window === "minimised");
    if (m.state !== r.state) {
      const was = r.state;
      r.state = m.state;
      r.el.dataset.state = m.state;
      if (r.clawd.state === "spin") r.clawd.after = m.state;
      else if (was === "working" && m.state === "idle") r.clawd.set("finished", "idle");
      else r.clawd.set(m.state);
    }
    stats(r);
  }

  window.addEventListener("message", ({ data }) => {
    if (data.type === "project") showProject(data.project);
    else if (data.type === "status") status(data);
  });
  setInterval(() => rows.forEach(stats), 30000);
  vscode.postMessage({ type: "ready" });
})();
