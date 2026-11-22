// Client for the remote-term service (term/ in this repo): asks every open editor page to show a
// session as a floating terminal window over the workbench.
const vscode = require("vscode");

const OPEN_URL = "http://127.0.0.1:8796/term/api/open";

async function openTerminal(tmux) {
  if (!tmux) return;
  try {
    const res = await fetch(OPEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmux }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    if (!body.overlays) {
      vscode.window.showWarningMessage("No terminal overlay is connected; open the editor through its public address and reload the page.");
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Could not open ${tmux}: ${err.message} (is remote-term.service running?)`);
  }
}

module.exports = { openTerminal };
