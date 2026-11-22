// TreeItem builders for the Projects view: project rows in overview mode, files and folders when
// drilled into one project.
const vscode = require("vscode");

function gitText(git) {
  if (!git) return "no git";
  return `${git.branch}${git.changed ? `  ${git.changed} changed` : ""}`;
}

function projectItem(el) {
  const { folder, project, git } = el;
  const item = new vscode.TreeItem(folder.name, vscode.TreeItemCollapsibleState.None);
  const n = project ? project.sessions.length : 0;
  item.id = `project:${folder.uri.toString()}`;
  item.description = `${gitText(git)}  ·  ${n ? `${n} session${n === 1 ? "" : "s"}` : "no sessions"}`;
  item.tooltip = `${folder.uri.fsPath}\nClick: show its Claude sessions. Double-click: open its files.`;
  item.iconPath = new vscode.ThemeIcon("repo");
  item.resourceUri = folder.uri;
  item.contextValue = "workspaceProject";
  item.command = { command: "remoteSessions.projects.click", title: "Select Project", arguments: [folder.uri.fsPath] };
  return item;
}

function entryItem(el) {
  const state = el.dir ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
  const item = new vscode.TreeItem(el.uri, state);
  item.id = el.uri.toString();
  item.tooltip = el.rel;
  item.contextValue = el.dir ? "projectDir" : "projectFile";
  if (!el.dir) item.command = { command: "vscode.open", title: "Open File", arguments: [el.uri] };
  return item;
}

module.exports = { projectItem, entryItem, gitText };
