// Entry point: polls running Claude sessions, feeds the sidebar tree and the workspace folder sync.
const vscode = require("vscode");
const { snapshot } = require("./discovery");
const { SessionTree } = require("./views/tree");
const { PromptView } = require("./views/prompt");
const { WorkspaceSync } = require("./workspace/sync");
const { register } = require("./commands");

function activate(context) {
  const tree = new SessionTree();
  const sync = new WorkspaceSync(context);
  const view = vscode.window.createTreeView("remoteSessions.tree", { treeDataProvider: tree, showCollapseAll: true });
  context.subscriptions.push(view);

  // Same panel in two places: under the Explorer while browsing files, and in the sessions sidebar.
  const prompts = [new PromptView(), new PromptView()];
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("remoteSessions.prompt", prompts[0], { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider("remoteSessions.promptPanel", prompts[1], { webviewOptions: { retainContextWhenHidden: true } })
  );
  const activePath = () => {
    const ed = vscode.window.activeTextEditor;
    return ed && ed.document.uri.scheme === "file" ? ed.document.uri.fsPath : null;
  };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => prompts.forEach((v) => v.follow(activePath())))
  );

  let busy = false;
  const refresh = async () => {
    if (busy) return;
    busy = true;
    try {
      const cfg = vscode.workspace.getConfiguration("remoteSessions");
      const projects = await snapshot({ includeLocal: cfg.get("includeLocal", true) });
      tree.update(projects);
      prompts.forEach((v) => { v.setProjects(projects); if (!v.root) v.follow(activePath()); });
      const n = projects.reduce((a, p) => a + p.sessions.length, 0);
      view.badge = { value: n, tooltip: `${n} running Claude sessions` };
      if (cfg.get("syncWorkspace", true)) await sync.apply(projects);
    } catch (err) {
      console.error("remoteSessions refresh failed", err);
    } finally {
      busy = false;
    }
  };

  register(context, { refresh, onReveal: (p) => prompts.forEach((v) => v.show(p)) });

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
}

function deactivate() {}

module.exports = { activate, deactivate };
