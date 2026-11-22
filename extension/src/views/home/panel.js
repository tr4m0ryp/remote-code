// "Home" editor tab: projects recommended to open. The empty-editor watermark cannot be extended, so
// this webview opens when the window starts empty and whenever the last tab closes, unless that tab
// was Home itself (no reopen loop). It polls only while visible.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { render } = require("./html");
const { buildModel } = require("./data");
const { latestEdited } = require("./latest");

const VIEW_TYPE = "remoteSessions.home";
const REFRESH_MS = 10000;
const STARTUP_DELAY_MS = 1500;

const tabCount = () => vscode.window.tabGroups.all.reduce((n, g) => n + g.tabs.length, 0);
const isHomeTab = (tab) => tab.input instanceof vscode.TabInputWebview && String(tab.input.viewType).endsWith(VIEW_TYPE);
const folderRoots = () => (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);

class HomePanel {
  // getSnapshot() -> latest discovery projects; getAddedAt() -> { root: ms }; openProject(root) drills in.
  constructor(context, { getSnapshot, getAddedAt, openProject }) {
    Object.assign(this, { getSnapshot, getAddedAt, openProject });
    this.panel = null;
    this.timer = null;
    this.busy = false;
    context.subscriptions.push(
      { dispose: () => clearInterval(this.timer) },
      vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, { deserializeWebviewPanel: async (panel) => this.attach(panel) }),
      vscode.window.tabGroups.onDidChangeTabs((e) => {
        if (e.closed.length && tabCount() === 0 && !e.closed.some(isHomeTab)) this.open();
      })
    );
    setTimeout(() => { if (tabCount() === 0) this.open(); }, STARTUP_DELAY_MS);
  }

  open() {
    if (this.panel) return this.panel.reveal(vscode.ViewColumn.One, true);
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, "Home", { viewColumn: vscode.ViewColumn.One, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    this.attach(panel);
  }

  attach(panel) {
    this.panel = panel;
    panel.webview.options = { enableScripts: true, localResourceRoots: [] };
    panel.webview.html = render(crypto.randomBytes(16).toString("base64"), panel.webview.cspSource);
    panel.webview.onDidReceiveMessage((m) => this.onMessage(m));
    panel.onDidChangeViewState(() => this.schedule());
    panel.onDidDispose(() => { clearInterval(this.timer); this.panel = null; });
    this.schedule();
  }

  schedule() {
    clearInterval(this.timer);
    if (!this.panel || !this.panel.visible) return;
    this.timer = setInterval(() => this.refresh(), REFRESH_MS);
    this.refresh();
  }

  async refresh(force) {
    if (!this.panel || (!this.panel.visible && !force) || this.busy) return;
    this.busy = true;
    try {
      const model = await buildModel({ folders: vscode.workspace.workspaceFolders || [], snapshot: this.getSnapshot(), addedAt: this.getAddedAt() });
      if (this.panel) this.panel.webview.postMessage({ type: "model", model });
    } catch (err) {
      console.error("remoteSessions home refresh failed", err);
    } finally {
      this.busy = false;
    }
  }

  // "Open" on a card: drill into the project, open its most recently edited file, then close Home.
  async openAndClose(root) {
    await this.openProject(root);
    const file = await latestEdited(root);
    if (file) await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file), { preview: false });
    if (this.panel) this.panel.dispose();
  }

  // Every message is checked: roots must be workspace folders, files must resolve inside that root.
  async onMessage(m) {
    if (!m || typeof m !== "object") return;
    if (m.type === "ready" || m.type === "refresh") return this.refresh(true);
    const root = typeof m.root === "string" && folderRoots().includes(m.root) ? m.root : null;
    if (!root) return;
    if (m.type === "open") return this.openAndClose(root);
    if (m.type !== "openFile" || typeof m.path !== "string") return;
    const file = path.resolve(root, m.path);
    if (!file.startsWith(root + path.sep)) return;
    try {
      if (!(await fs.promises.stat(file)).isFile()) return;
    } catch {
      return;
    }
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file), { preview: false });
  }
}

module.exports = { HomePanel, VIEW_TYPE };
