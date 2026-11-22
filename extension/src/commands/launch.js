// "New Session" command: pick a directory (current project, workspace folders, or any folder under
// $HOME), name the session, launch it in tmux, refresh discovery and open its terminal window.
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { launch, checkDir, checkName, defaultName, tmuxName, sessionExists } = require("../launch");
const { openTerminal } = require("../term");

const TITLE = "New Claude session";

async function pickDir(current) {
  const items = [];
  const seen = new Set();
  const add = (dir, detail) => {
    if (!dir || seen.has(dir)) return;
    seen.add(dir);
    items.push({ label: path.basename(dir) || dir, description: dir, detail, dir });
  };
  add(current, "current project");
  for (const f of vscode.workspace.workspaceFolders || []) if (f.uri.scheme === "file") add(f.uri.fsPath);
  items.push({ label: "$(folder) Other folder...", other: true });
  const pick = await vscode.window.showQuickPick(items, { title: TITLE, placeHolder: "Directory to start Claude in", matchOnDescription: true });
  if (!pick || !pick.other) return pick && pick.dir;
  return vscode.window.showInputBox({
    title: TITLE,
    prompt: `Absolute path of a directory inside ${os.homedir()}`,
    value: os.homedir() + path.sep,
    validateInput: (v) => checkDir(v.trim()),
  });
}

function registerLaunch(context, { refresh }) {
  const cmd = vscode.commands.registerCommand("remoteSessions.launch", async (current) => {
    const dir = (await pickDir(typeof current === "string" ? current : null) || "").trim();
    if (!dir) return;
    const name = await vscode.window.showInputBox({
      title: TITLE,
      prompt: `Session name (remote-control name; tmux session rc-<name>) for ${dir}`,
      value: defaultName(dir),
      validateInput: async (v) => checkName(v) || ((await sessionExists(tmuxName(v))) ? `tmux session ${tmuxName(v)} already exists` : null),
    });
    if (!name) return;
    const configDir = vscode.workspace.getConfiguration("remoteSessions").get("launchConfigDir") || path.join(os.homedir(), ".claude-cavum");
    try {
      const tmux = await launch({ dir, name, configDir });
      await refresh();
      await openTerminal(tmux);
    } catch (err) {
      vscode.window.showErrorMessage(`Could not start the session: ${err.message}`);
    }
  });
  context.subscriptions.push(cmd);
}

module.exports = { registerLaunch };
