// "New Session" command. With a project in context (the Sessions panel's "+ New session", or the tree
// title + while a project is selected) it launches at once in that directory, named after it
// (<basename>-<2 hex>, tmux rc-<name>); without one it first asks for a folder. Then it refreshes
// discovery and opens the session's floating terminal window.
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { launch, checkDir, defaultName, tmuxName, sessionExists } = require("../launch");
const { openTerminal } = require("../term");

const TITLE = "New Claude session";

async function pickDir() {
  const items = [];
  for (const f of vscode.workspace.workspaceFolders || []) {
    if (f.uri.scheme === "file") items.push({ label: path.basename(f.uri.fsPath), description: f.uri.fsPath, dir: f.uri.fsPath });
  }
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

// <basename>-<2 hex>, drawing new hex until the tmux name is free.
async function freeName(dir) {
  for (let i = 0; i < 16; i++) {
    const name = defaultName(dir);
    if (!(await sessionExists(tmuxName(name)))) return name;
  }
  throw new Error("no free session name after 16 tries");
}

function registerLaunch(context, { refresh, currentRoot }) {
  const cmd = vscode.commands.registerCommand("remoteSessions.launch", async (dirArg) => {
    const given = typeof dirArg === "string" ? dirArg : currentRoot();
    const dir = ((given || (await pickDir())) || "").trim();
    if (!dir) return;
    const configDir = vscode.workspace.getConfiguration("remoteSessions").get("launchConfigDir") || path.join(os.homedir(), ".claude-cavum");
    try {
      const tmux = await launch({ dir, name: await freeName(dir), configDir });
      await refresh();
      await openTerminal(tmux);
    } catch (err) {
      vscode.window.showErrorMessage(`Could not start a session in ${dir}: ${err.message}`);
    }
  });
  context.subscriptions.push(cmd);
}

module.exports = { registerLaunch };
