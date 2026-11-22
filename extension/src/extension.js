// Entry point: polls running Claude sessions, feeds the sidebar views, the Home tab and the workspace
// folder sync.
const vscode = require("vscode");
const { snapshot } = require("./discovery");
const { SessionTree, SessionsView, ProjectsView, HomePanel } = require("./views");
const { WorkspaceSync, applyFirstRunLayout } = require("./workspace");
const { register, registerProjects } = require("./commands");

function activate(context) {
  const tree = new SessionTree();
  const sync = new WorkspaceSync(context);
  const view = vscode.window.createTreeView("remoteSessions.tree", { treeDataProvider: tree, showCollapseAll: true });
  context.subscriptions.push(view);

  // Same panel in two places: under the Explorer while browsing files, and in the sessions sidebar.
  const panels = [new SessionsView(context.extensionUri), new SessionsView(context.extensionUri)];
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("remoteSessions.prompt", panels[0], { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider("remoteSessions.promptPanel", panels[1], { webviewOptions: { retainContextWhenHidden: true } })
  );
  const select = (p) => panels.forEach((v) => v.show(p));
  const projects = new ProjectsView(context, { onSelect: select });

  // Panels follow the active file, except while the Projects view is drilled into one project.
  const activePath = () => {
    const ed = vscode.window.activeTextEditor;
    return ed && ed.document.uri.scheme === "file" ? ed.document.uri.fsPath : null;
  };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => { if (!projects.focused) panels.forEach((v) => v.follow(activePath())); })
  );

  let latest = [];
  const openProject = async (root) => {
    await vscode.commands.executeCommand("remoteSessions.projects.focus");
    projects.drill(root);
  };
  const home = new HomePanel(context, { getSnapshot: () => latest, getAddedAt: () => sync.addedAt(), openProject });

  let busy = false;
  const refresh = async () => {
    if (busy) return;
    busy = true;
    try {
      const cfg = vscode.workspace.getConfiguration("remoteSessions");
      latest = (await snapshot({ includeLocal: cfg.get("includeLocal", true) })).filter((p) => !sync.excluded(p.root));
      tree.update(latest);
      panels.forEach((v) => { v.setProjects(latest); if (!v.root) v.follow(activePath()); });
      const n = latest.reduce((a, p) => a + p.sessions.length, 0);
      view.badge = { value: n, tooltip: `${n} running Claude sessions` };
      if (cfg.get("syncWorkspace", true)) await sync.apply(latest);
      await projects.setSnapshot(latest);
    } catch (err) {
      console.error("remoteSessions refresh failed", err);
    } finally {
      busy = false;
    }
  };

  // Project in context for the tree's "New Session": the selected tree row, else the project the
  // Sessions panel in that sidebar shows.
  const currentRoot = () => {
    const el = view.selection[0];
    return (el && el.project && el.project.root) || panels[1].root || null;
  };
  register(context, { refresh, onReveal: select, currentRoot });
  registerProjects(context, { projects, home });

  let timer;
  const schedule = () => {
    clearInterval(timer);
    const secs = Math.max(3, vscode.workspace.getConfiguration("remoteSessions").get("pollSeconds", 15));
    timer = setInterval(refresh, secs * 1000);
  };
  schedule();
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("remoteSessions")) { schedule(); refresh(); }
    })
  );
  refresh();
  applyFirstRunLayout(context);
  // VS Code's AI features are removed, so the right-hand (Chat) side bar is always empty: close it.
  Promise.resolve(vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar")).catch(() => {});
}

function deactivate() {}

module.exports = { activate, deactivate };
