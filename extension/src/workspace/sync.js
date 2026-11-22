// Keeps one workspace folder per running project. Folders the user added by hand are never touched;
// a managed folder is dropped only after its project has been absent for GRACE scans, so a session
// relaunch does not make it flicker out and back. The time each folder was added is kept for the Home page.
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const GRACE = 3;
const STATE_KEY = "remoteSessions.managed";
const ADDED_KEY = "remoteSessions.addedAt";
const ADDED_KEEP_MS = 30 * 86400 * 1000;

class WorkspaceSync {
  constructor(context) {
    this.context = context;
    this.missing = new Map(); // root -> consecutive scans absent
  }

  excluded(root) {
    const list = vscode.workspace.getConfiguration("remoteSessions").get("excludeRoots", []);
    return list.some((e) => path.resolve(e.replace(/^~(?=$|\/)/, os.homedir())) === root);
  }

  // { root: ms since epoch } for folders this sync added in the last 30 days.
  addedAt() {
    return this.context.globalState.get(ADDED_KEY, {});
  }

  async recordAdded(roots) {
    const now = Date.now();
    const next = Object.fromEntries(Object.entries(this.addedAt()).filter(([, at]) => now - at < ADDED_KEEP_MS));
    for (const root of roots) next[root] = now;
    await this.context.globalState.update(ADDED_KEY, next);
  }

  async apply(projects) {
    if (!vscode.workspace.workspaceFile) return; // a single-folder window would reload on change
    const managed = new Set(this.context.globalState.get(STATE_KEY, []));
    const current = vscode.workspace.workspaceFolders || [];
    const present = new Set(current.map((f) => f.uri.fsPath));
    const live = new Map(projects.filter((p) => !this.excluded(p.root)).map((p) => [p.root, p.label]));

    for (const root of live.keys()) this.missing.delete(root);
    const keep = current.filter((f) => {
      const root = f.uri.fsPath;
      if (!managed.has(root) || live.has(root)) return true;
      const n = (this.missing.get(root) || 0) + 1;
      this.missing.set(root, n);
      return n < GRACE;
    });
    const added = [...live.keys()].filter((root) => !present.has(root));
    if (added.length === 0 && keep.length === current.length) return;

    for (const root of added) managed.add(root);
    for (const f of current) if (!keep.includes(f)) { managed.delete(f.uri.fsPath); this.missing.delete(f.uri.fsPath); }
    await this.context.globalState.update(STATE_KEY, [...managed]);
    if (added.length) await this.recordAdded(added);

    // Changing the first folder restarts the extension host, so kept folders hold their order and
    // new ones append; the first slot is rewritten only when that folder itself is removed.
    const next = [
      ...keep.map((f) => ({ uri: f.uri, name: f.name })),
      ...added
        .map((root) => ({ uri: vscode.Uri.file(root), name: live.get(root) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ];
    if (current.length && keep[0] === current[0]) {
      vscode.workspace.updateWorkspaceFolders(1, current.length - 1, ...next.slice(1));
    } else {
      vscode.workspace.updateWorkspaceFolders(0, current.length, ...next);
    }
  }
}

module.exports = { WorkspaceSync };
