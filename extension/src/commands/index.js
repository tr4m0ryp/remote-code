// Command handlers for the session tree; the Projects view and Home tab commands live in projects.js,
// the New Session flow in launch.js.
const vscode = require("vscode");
const { registerProjects } = require("./projects");
const { registerLaunch } = require("./launch");
const { openTerminal } = require("../term");

function register(context, { refresh, onReveal }) {
  const projectOf = (el) => (el && el.project) || null;
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg("remoteSessions.refresh", refresh);
  registerLaunch(context, { refresh });

  // Tree click: point the "This project" panel at the project without leaving the sidebar.
  reg("remoteSessions.select", (el) => {
    const p = projectOf(el);
    if (p) onReveal(p);
  });

  reg("remoteSessions.reveal", async (el) => {
    const p = projectOf(el);
    if (!p) return;
    onReveal(p);
    const uri = vscode.Uri.file(p.root);
    if (!vscode.workspace.getWorkspaceFolder(uri)) {
      vscode.window.showInformationMessage(`${p.label} is not open yet; it joins the workspace on the next scan.`);
      return;
    }
    await vscode.commands.executeCommand("revealInExplorer", uri);
    await vscode.commands.executeCommand("list.expand");
  });

  // Session row click or inline button: the session opens as a floating terminal window over the
  // editor (remote-term overlay), and the "This project" panel follows its project.
  reg("remoteSessions.watch", (el) => {
    if (!el || !el.session || !el.session.tmux) return;
    if (el.project) onReveal(el.project);
    openTerminal(el.session.tmux);
  });
}

module.exports = { register, registerProjects };
