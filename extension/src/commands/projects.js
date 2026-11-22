// Command handlers for the Projects view and the Home tab.
const vscode = require("vscode");

function registerProjects(context, { projects, home }) {
  const reg = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  // Fired on every click of a project row; the view turns a quick second click into a drill-in.
  reg("remoteSessions.projects.click", (root) => projects.click(root));
  // Inline arrow on a project row: the discoverable alternative to double-click.
  reg("remoteSessions.projects.open", (el) => {
    const root = el && el.folder ? el.folder.uri.fsPath : null;
    if (root) projects.drill(root);
  });
  reg("remoteSessions.projects.back", () => projects.back());
  reg("remoteSessions.home", () => home.open());
}

module.exports = { registerProjects };
