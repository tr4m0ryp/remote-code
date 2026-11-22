// Tree data for the Projects view. Overview mode lists one row per workspace folder; focus mode lists
// one project's file tree, read lazily one directory at a time.
const vscode = require("vscode");
const { listDir, excludeMatchers } = require("./files");
const { projectItem, entryItem } = require("./items");

class ProjectsProvider {
  constructor() {
    this.snapshot = []; // latest discovery snapshot: projects with running sessions
    this.git = new Map(); // root -> { branch, changed } for every folder
    this.focus = null; // workspace folder drilled into, or null in overview mode
    this.matchers = [];
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._emitter.event;
  }

  refresh() {
    this._emitter.fire();
  }

  setFocus(folder) {
    this.focus = folder;
    this.matchers = folder ? excludeMatchers(folder.uri) : [];
    this.refresh();
  }

  projectFor(root) {
    return this.snapshot.find((p) => p.root === root) || null;
  }

  async getChildren(el) {
    if (!this.focus) {
      if (el) return [];
      return (vscode.workspace.workspaceFolders || []).map((folder) => {
        const root = folder.uri.fsPath;
        const project = this.projectFor(root);
        return { kind: "project", folder, project, git: (project && project.git) || this.git.get(root) || null };
      });
    }
    if (el && !el.dir) return [];
    const dir = el || { uri: this.focus.uri, rel: "" };
    const entries = await listDir(dir.uri, dir.rel, this.matchers);
    return entries.map((e) => ({ kind: "entry", ...e }));
  }

  getTreeItem(el) {
    return el.kind === "project" ? projectItem(el) : entryItem(el);
  }
}

module.exports = { ProjectsProvider };
