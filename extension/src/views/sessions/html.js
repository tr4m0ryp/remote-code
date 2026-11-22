// Static markup for the "Sessions" panel. All data arrives via postMessage; nothing is interpolated
// into the HTML except the CSP nonce, so session names and pane output cannot inject markup.
function render(nonce, cspSource) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { padding: 6px 10px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  .empty { opacity: .7; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin: 4px 0 8px; }
  h3 { margin: 0; font-size: 1em; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0;
           padding: 3px 10px; cursor: pointer; white-space: nowrap; font-family: inherit; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; cursor: pointer; }
  .card:hover { background: var(--vscode-list-hoverBackground); }
  .card.notmux { cursor: default; opacity: .7; }
  .head { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; }
  .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { font-size: .85em; opacity: .8; white-space: nowrap; }
  .state.busy { color: var(--vscode-charts-yellow); opacity: 1; }
  .state.idle { color: var(--vscode-charts-green); opacity: 1; }
  .meta { font-size: .8em; opacity: .65; margin-top: 2px; }
  pre { max-height: 3.9em; overflow: hidden; font-size: .75em; line-height: 1.3em; opacity: .75; margin: 4px 0 0;
        white-space: pre-wrap; word-break: break-word; }
  pre:empty { display: none; }
</style></head>
<body><div id="root"><p class="empty">Open a file in a project to see its sessions.</p></div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const root = document.getElementById("root");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const age = (s) => s < 3600 ? Math.max(1, Math.round(s / 60)) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : Math.round(s / 86400) + "d";

function card(s) {
  const c = el("div", "card" + (s.pane ? "" : " notmux")); c.dataset.pane = s.pane || "";
  const head = el("div", "head");
  head.append(el("span", "name", s.name), el("span", "state", s.pane ? "checking" : "no tmux pane"));
  c.append(head, el("div", "meta", (s.tmux || "not in tmux") + "  \\u00b7  up " + age(s.uptime || 0)), el("pre"));
  if (s.pane) {
    c.title = "Open " + s.name + " in a terminal window";
    c.addEventListener("click", () => vscode.postMessage({ type: "open", pane: s.pane }));
  }
  return c;
}

function header(label) {
  const top = el("div", "top");
  const add = el("button", null, "+ New session"); add.title = "Launch a new Claude session";
  add.addEventListener("click", () => vscode.postMessage({ type: "launch" }));
  top.append(el("h3", null, label), add);
  return top;
}

window.addEventListener("message", ({ data }) => {
  if (data.type === "project") {
    root.replaceChildren();
    if (!data.project) { root.append(header("Sessions"), el("p", "empty", "Open a file in a project to see its sessions.")); return; }
    root.append(header(data.project.label + "  (" + data.project.sessions.length + ")"));
    if (!data.project.sessions.length) root.append(el("p", "empty", "No Claude session is running in this project."));
    for (const s of data.project.sessions) root.append(card(s));
  } else if (data.type === "status") {
    const c = root.querySelector('.card[data-pane="' + CSS.escape(data.pane) + '"]'); if (!c) return;
    const st = c.querySelector(".state"); st.textContent = data.busy ? "working" : "idle"; st.className = "state " + (data.busy ? "busy" : "idle");
    c.querySelector("pre").textContent = data.tail;
  }
});
vscode.postMessage({ type: "ready" });
</script></body></html>`;
}

module.exports = { render };
