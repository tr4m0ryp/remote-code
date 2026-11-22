// Sidebar tree: projects at the top level, the Claude sessions working in each as children.
const vscode = require("vscode");

function age(seconds) {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

class SessionTree {
  constructor() {
    this.projects = [];
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._emitter.event;
  }

  update(projects) {
    this.projects = projects;
    this._emitter.fire();
  }

  getChildren(element) {
    if (!element) return this.projects.map((p) => ({ kind: "project", project: p }));
    if (element.kind === "project") return element.project.sessions.map((s) => ({ kind: "session", session: s, project: element.project }));
    return [];
  }

  getTreeItem(el) {
    return el.kind === "project" ? projectItem(el.project) : sessionItem(el.session, el.project);
  }
}

function projectItem(p) {
  const item = new vscode.TreeItem(p.label, vscode.TreeItemCollapsibleState.Collapsed);
  const git = p.git ? `${p.git.branch}${p.git.changed ? `  ${p.git.changed} changed` : ""}` : "no git";
  const n = p.sessions.length;
  item.description = `${git}  ·  ${n} session${n === 1 ? "" : "s"}`;
  item.tooltip = p.root;
  item.iconPath = new vscode.ThemeIcon(p.git && p.git.changed ? "repo-forked" : "repo");
  item.contextValue = "project";
  item.resourceUri = vscode.Uri.file(p.root);
  item.command = { command: "remoteSessions.select", title: "Show Sessions", arguments: [{ kind: "project", project: p }] };
  return item;
}

function sessionItem(s, p) {
  const item = new vscode.TreeItem(s.name, vscode.TreeItemCollapsibleState.None);
  item.description = `${s.tmux || "no tmux"}  ·  up ${age(s.uptime)}`;
  item.tooltip = `${s.remote ? "remote-control" : "local"} session, pid ${s.pid}\n${p.root}`;
  item.iconPath = new vscode.ThemeIcon(s.remote ? "broadcast" : "terminal");
  item.contextValue = s.tmux ? "session" : "session-notmux";
  item.command = { command: "remoteSessions.select", title: "Show Sessions", arguments: [{ kind: "project", project: p }] };
  return item;
}

module.exports = { SessionTree };
