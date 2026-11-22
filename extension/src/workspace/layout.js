// One-time sidebar layout, guarded by a globalState flag so a user who rearranges views later is never
// overridden. The native Folders view cannot be hidden (its descriptor has canToggleVisibility false,
// so `workbench.explorer.fileView.removeView` is a no-op); it can be moved, so it goes to the Remote
// Sessions sidebar, where "Reset Location" in its title menu brings it back to the Explorer. Outline and
// Timeline (order 2, above every extension view) are hidden so Projects comes first; the Explorer "..."
// menu shows them again.
const vscode = require("vscode");

const LAYOUT_KEY = "remoteSessions.layout.v2";
const SESSIONS_CONTAINER = "workbench.view.extension.remoteSessions"; // contributed containers get this prefix

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
  await step("vscode.moveViews", { viewIds: ["workbench.explorer.fileView"], destinationId: SESSIONS_CONTAINER });
  // Explorer views start collapsed in a fresh profile; focusing each one expands it. removeView only
  // acts while the Explorer is open, so it runs after the first focus.
  await step("remoteSessions.projects.focus");
  await step("outline.removeView");
  await step("timeline.removeView");
  await step("remoteSessions.prompt.focus");
  await step("workbench.action.focusActiveEditorGroup");
}

module.exports = { applyFirstRunLayout };
