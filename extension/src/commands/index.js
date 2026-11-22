// Command handlers for the session tree; the Projects view and Home tab commands live in projects.js.
const vscode = require("vscode");
const { registerProjects } = require("./projects");

function register(context, { refresh, onReveal }) {
  const projectOf = (el) => (el && el.project) || null;
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg("remoteSessions.refresh", refresh);

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

  // Read-only attach: the viewer sees the Claude session live but cannot type into it or resize it.
  reg("remoteSessions.watch", (el) => {
    if (!el || !el.session || !el.session.tmux) return;
    const term = vscode.window.createTerminal({ name: `watch ${el.session.tmux}`, cwd: el.project.root });
    term.sendText(`exec tmux attach -r -f ignore-size -t '${el.session.tmux.replace(/'/g, "'\\''")}'`);
    term.show();
  });
}

module.exports = { register, registerProjects };
