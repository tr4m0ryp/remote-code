// One-time sidebar layout, guarded by a globalState flag so a user who rearranges views later is never
// overridden. The native Folders view cannot be hidden (its descriptor has canToggleVisibility false,
// so `workbench.explorer.fileView.removeView` is a no-op); it can be moved, so it goes to the Remote
// Sessions sidebar, where "Reset Location" in its title menu brings it back to the Explorer.
const vscode = require("vscode");

const LAYOUT_KEY = "remoteSessions.layout.v1";

async function step(command, ...args) {
  try {
    await vscode.commands.executeCommand(command, ...args);
  } catch (err) {
    console.warn(`remoteSessions layout: ${command} failed`, err && err.message);
  }
}

async function applyFirstRunLayout(context) {
  if (context.globalState.get(LAYOUT_KEY)) return;
  await context.globalState.update(LAYOUT_KEY, Date.now());
  await step("vscode.moveViews", { viewIds: ["workbench.explorer.fileView"], destinationId: "remoteSessions" });
  // Explorer views start collapsed in a fresh profile; focusing each one expands it.
  await step("remoteSessions.projects.focus");
  await step("remoteSessions.prompt.focus");
  await step("workbench.action.focusActiveEditorGroup");
}

module.exports = { applyFirstRunLayout };
