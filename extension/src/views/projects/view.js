// "Projects" view controller: overview of workspace folders, drill-in on double-click (tree items have
// no native double-click, so two clicks on one row within DOUBLE_MS count as one), a back action, and
// a debounced file watcher while drilled in.
const vscode = require("vscode");
const { ProjectsProvider } = require("./provider");
const { repoStatus } = require("../../discovery");

const DOUBLE_MS = 450;
const WATCH_DEBOUNCE_MS = 300;
const CONTEXT_KEY = "remoteSessions.projectFocused";

class ProjectsView {
  // onSelect(project) points the Claude Sessions panels at a project.
  constructor(context, { onSelect }) {
    this.onSelect = onSelect;
    this.provider = new ProjectsProvider();
    this.view = vscode.window.createTreeView("remoteSessions.projects", { treeDataProvider: this.provider, showCollapseAll: true });
    this.lastClick = { root: null, at: 0 };
    this.ignoreUntil = 0;
    this.watcher = null;
    this.timer = null;
    context.subscriptions.push(
      this.view,
      { dispose: () => this.unwatch() },
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.onFoldersChanged()),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (this.focused && e.affectsConfiguration("files.exclude")) this.provider.setFocus(this.focusedFolder);
      })
    );
    vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
  }

  get focusedFolder() {
    return this.provider.focus;
  }

  get focused() {
    return this.focusedFolder ? this.project(this.focusedFolder.uri.fsPath) : null;
  }

  folderFor(root) {
    return (vscode.workspace.workspaceFolders || []).find((f) => f.uri.fsPath === root) || null;
  }

  // Snapshot project for a root, or a session-less stand-in so the panels can still show it.
  project(root) {
    const folder = this.folderFor(root);
    const p = this.provider.projectFor(root);
    if (p) return p;
    return folder ? { root, label: folder.name, sessions: [], git: this.provider.git.get(root) || null } : null;
  }

  async setSnapshot(projects) {
    this.provider.snapshot = projects;
    const known = new Set(projects.map((p) => p.root));
    const others = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath).filter((r) => !known.has(r));
    await Promise.all(others.map(async (r) => this.provider.git.set(r, await repoStatus(r))));
    for (const p of projects) this.provider.git.set(p.root, p.git);
    if (this.focused) this.updateTitle();
    else this.provider.refresh();
  }

  click(root) {
    const now = Date.now();
    if (typeof root !== "string" || this.focused || now < this.ignoreUntil) return;
    const p = this.project(root);
    if (!p) return;
    if (this.lastClick.root === root && now - this.lastClick.at < DOUBLE_MS) {
      this.lastClick = { root: null, at: 0 };
      this.ignoreUntil = now + DOUBLE_MS; // swallow the trailing dblclick open event
      this.drill(root);
      return;
    }
    this.lastClick = { root, at: now };
    this.onSelect(p);
  }

  drill(root) {
    const folder = this.folderFor(root);
    if (!folder) return false;
    this.provider.setFocus(folder);
    this.updateTitle();
    vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
    this.watch(folder);
    this.onSelect(this.project(root));
    return true;
  }

  back() {
    this.unwatch();
    this.provider.setFocus(null);
    this.view.title = "Projects";
    this.view.description = undefined;
    vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
  }

  updateTitle() {
    const f = this.focusedFolder;
    if (!f) return;
    const git = this.provider.git.get(f.uri.fsPath);
    this.view.title = f.name;
    this.view.description = git ? git.branch : undefined;
  }

  watch(folder) {
    this.unwatch();
    this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, "**/*"));
    const bump = (uri) => {
      if (/[\\/]\.git([\\/]|$)/.test(uri.fsPath)) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.provider.refresh(), WATCH_DEBOUNCE_MS);
    };
    this.watcher.onDidCreate(bump);
    this.watcher.onDidDelete(bump);
  }

  unwatch() {
    clearTimeout(this.timer);
    if (this.watcher) this.watcher.dispose();
    this.watcher = null;
  }

  onFoldersChanged() {
    const f = this.focusedFolder;
    if (f && !this.folderFor(f.uri.fsPath)) this.back();
    else if (!f) this.provider.refresh();
  }
}

module.exports = { ProjectsView };
