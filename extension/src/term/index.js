// Client for the remote-term service (term/ in this repo): asks the open editor page to show (or
// restore) a session as a floating terminal window, and reads which windows are minimised.
const vscode = require("vscode");

const BASE = "http://127.0.0.1:8796/term/api";
const OPEN_URL = BASE + "/open";

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

// Map<tmux, { min }> of session windows open in editor pages; empty when the service is down.
async function windowStates() {
  try {
    const res = await fetch(BASE + "/windows", { signal: AbortSignal.timeout(1500) });
    const body = await res.json();
    return new Map((body.windows || []).map((w) => [w.tmux, { min: Boolean(w.min) }]));
  } catch {
    return new Map();
  }
}

module.exports = { openTerminal, windowStates };
