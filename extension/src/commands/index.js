// Command handlers for the session tree.
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const LIVE_WORKSPACE = path.join(os.homedir(), ".local/share/code-server/live.code-workspace");

function register(context, { refresh, onReveal }) {
  const projectOf = (el) => (el && el.project) || null;
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg("remoteSessions.refresh", refresh);

  reg("remoteSessions.reveal", async (el) => {
    const p = projectOf(el);
    if (!p) return;
    onReveal(p);
    const uri = vscode.Uri.file(p.root);
    if (!vscode.workspace.getWorkspaceFolder(uri)) {
      vscode.window.showInformationMessage(`${p.label} is not in this workspace. Use "Open Project Alone" or the live workspace.`);
      return;
    }
    await vscode.commands.executeCommand("revealInExplorer", uri);
    await vscode.commands.executeCommand("list.expand");
  });

  reg("remoteSessions.openAlone", async (el) => {
    const p = projectOf(el);
    if (p) await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(p.root), { forceNewWindow: false });
  });

  // Read-only attach: the viewer sees the Claude session live but cannot type into it or resize it.
  reg("remoteSessions.watch", (el) => {
    if (!el || !el.session || !el.session.tmux) return;
    const term = vscode.window.createTerminal({ name: `watch ${el.session.tmux}`, cwd: el.project.root });
    term.sendText(`exec tmux attach -r -f ignore-size -t '${el.session.tmux.replace(/'/g, "'\\''")}'`);
    term.show();
  });

  reg("remoteSessions.openLive", () => vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(LIVE_WORKSPACE)));
}

module.exports = { register, LIVE_WORKSPACE };
