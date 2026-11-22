// "This project" panel: the Claude sessions working in the project of the active file, their live
// status, and a prompt box per session that types into that session's own terminal.
const crypto = require("crypto");
const path = require("path");
const vscode = require("vscode");
const { render } = require("./html");
const { sendPrompt, paneStatus } = require("../../prompt");
const { openTerminal } = require("../../term");

const STATUS_MS = 3000;

class PromptView {
  constructor() {
    this.projects = [];
    this.root = null; // project root currently shown
    this.fallback = null; // project picked by hand that has no running session (absent from projects)
    this.view = null;
    this.timer = null;
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = render(crypto.randomBytes(16).toString("base64"), view.webview.cspSource);
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
    const project = p && { label: p.label, root: p.root, sessions: p.sessions.map((s) => ({ name: s.name, pane: s.pane })) };
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
    for (const s of p.sessions.filter((x) => x.pane)) {
      const st = await paneStatus(s.pane);
      this.view.webview.postMessage({ type: "status", pane: s.pane, ...st });
    }
  }

  async onMessage(m) {
    if (m.type === "ready") return this.post();
    if (m.type === "terminal") {
      const s = this.project && this.project.sessions.find((x) => x.pane && x.pane === m.pane);
      return s && openTerminal(s.tmux);
    }
    if (m.type !== "send") return;
    // Only panes of the project on screen are accepted; the webview cannot target arbitrary panes.
    const p = this.project;
    const ok = p && p.sessions.some((s) => s.pane && s.pane === m.pane);
    let error = ok ? null : "session is no longer running in this project";
    if (ok) {
      try {
        await sendPrompt(m.pane, m.text);
      } catch (err) {
        error = err.message;
      }
    }
    this.view && this.view.webview.postMessage({ type: "sent", pane: m.pane, error });
    setTimeout(() => this.pollStatus(), 800);
  }
}

module.exports = { PromptView };
