// "Sessions" panel: one compact row per Claude session working in the project of the active file,
// with a state (working, idle, sleeping after 30 min without activity). Display only: clicking a row
// opens its floating terminal window (remote-term), and "New session" launches one in this project.
// Nothing is ever typed into a session from here.
const crypto = require("crypto");
const path = require("path");
const vscode = require("vscode");
const { render } = require("./html");
const { paneStatus } = require("../../discovery");
const { openTerminal } = require("../../term");

const STATUS_MS = 3000;
const SLEEP_MS = 30 * 60 * 1000;

class SessionsView {
  constructor(extensionUri) {
    this.media = vscode.Uri.joinPath(extensionUri, "media", "sessions");
    this.lastBusy = new Map(); // pane -> ms of the last poll that saw Claude working
    this.projects = [];
    this.root = null; // project root currently shown
    this.fallback = null; // project picked by hand that has no running session (absent from projects)
    this.view = null;
    this.timer = null;
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.media] };
    const scripts = ["clawd.js", "panel.js"].map((f) => view.webview.asWebviewUri(vscode.Uri.joinPath(this.media, f)).toString());
    view.webview.html = render(crypto.randomBytes(16).toString("base64"), view.webview.cspSource, scripts);
    view.webview.onDidReceiveMessage((m) => this.onMessage(m));
    view.onDidChangeVisibility(() => this.schedule());
    view.onDidDispose(() => { clearInterval(this.timer); this.view = null; });
    this.schedule();
  }

  get project() {
    const fb = this.fallback && this.fallback.root === this.root ? this.fallback : null;
    return this.projects.find((p) => p.root === this.root) || fb;
  }

  // Deepest project root that contains the path; null when the path is outside every project.
  projectFor(fsPath) {
    const hits = this.projects.filter((p) => fsPath === p.root || fsPath.startsWith(p.root + path.sep));
    return hits.sort((a, b) => b.root.length - a.root.length)[0] || null;
  }

  setProjects(projects) {
    const before = JSON.stringify(this.project);
    this.projects = projects;
    if (JSON.stringify(this.project) !== before) this.post();
  }

  follow(fsPath) {
    const p = fsPath ? this.projectFor(fsPath) : null;
    if (!p || p.root === this.root) return;
    this.root = p.root;
    this.post();
  }

  show(project) {
    this.root = project.root;
    this.fallback = project;
    this.post();
  }

  post() {
    if (!this.view) return;
    const p = this.project;
    const project = p && {
      label: p.label,
      root: p.root,
      sessions: p.sessions.map((s) => ({ name: s.name, pane: s.pane, tmux: s.tmux, uptime: s.uptime })),
    };
    this.view.webview.postMessage({ type: "project", project });
    this.pollStatus();
  }

  schedule() {
    clearInterval(this.timer);
    if (this.view && this.view.visible) this.timer = setInterval(() => this.pollStatus(), STATUS_MS);
  }

  async pollStatus() {
    const p = this.project;
    if (!this.view || !this.view.visible || !p) return;
    const now = Date.now();
    for (const s of p.sessions.filter((x) => x.pane)) {
      const st = await paneStatus(s.pane);
      // Last activity: the last poll that saw Claude working, seeded from tmux's window activity.
      if (st.busy) this.lastBusy.set(s.pane, now);
      else if (!this.lastBusy.has(s.pane)) this.lastBusy.set(s.pane, st.activity || now);
      const lastActive = this.lastBusy.get(s.pane);
      const state = st.busy ? "working" : now - lastActive > SLEEP_MS ? "sleeping" : "idle";
      if (this.view) this.view.webview.postMessage({ type: "status", pane: s.pane, state, lastActive });
    }
  }

  onMessage(m) {
    if (m.type === "ready") return this.post();
    if (m.type === "launch") return this.root && vscode.commands.executeCommand("remoteSessions.launch", this.root);
    if (m.type === "open") {
      // Only sessions of the project on screen are accepted; the webview cannot name arbitrary targets.
      const s = this.project && this.project.sessions.find((x) => x.pane && x.pane === m.pane);
      if (s && s.tmux) openTerminal(s.tmux);
    }
  }
}

module.exports = { SessionsView };
