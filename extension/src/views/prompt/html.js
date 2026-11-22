// Static markup for the "This project" panel. All data arrives via postMessage; nothing is interpolated
// into the HTML except the CSP nonce, so session names and pane output cannot inject markup.
function render(nonce, cspSource) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { padding: 6px 10px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  .empty { opacity: .7; }
  h3 { margin: 4px 0 8px; font-size: 1em; font-weight: 600; }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; margin-bottom: 10px; }
  .head { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; }
  .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { font-size: .85em; opacity: .8; white-space: nowrap; }
  .state.busy { color: var(--vscode-charts-yellow); opacity: 1; }
  .state.idle { color: var(--vscode-charts-green); opacity: 1; }
  pre { max-height: 140px; overflow: auto; font-size: .8em; background: var(--vscode-textCodeBlock-background);
        padding: 4px 6px; margin: 6px 0; white-space: pre-wrap; word-break: break-word; }
  textarea { width: 100%; box-sizing: border-box; min-height: 64px; resize: vertical; font-family: inherit;
             color: var(--vscode-input-foreground); background: var(--vscode-input-background);
             border: 1px solid var(--vscode-input-border, transparent); padding: 4px; }
  .row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; gap: 6px; }
  .hint { font-size: .8em; opacity: .65; }
  button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0;
           padding: 4px 12px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground);
                     padding: 2px 8px; font-size: .85em; white-space: nowrap; }
  .msg { font-size: .8em; margin-top: 4px; }
</style></head>
<body><div id="root"><p class="empty">Open a file in a project to see its sessions.</p></div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const root = document.getElementById("root");
const drafts = vscode.getState() || {};
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function card(s) {
  const c = el("div", "card"); c.dataset.pane = s.pane || "";
  const head = el("div", "head");
  head.append(el("span", "name", s.name), el("span", "state", s.pane ? "checking" : "no tmux pane"));
  if (s.pane) {
    const open = el("button", "secondary", "Open terminal"); open.title = "Open this session as a floating terminal window";
    open.addEventListener("click", () => vscode.postMessage({ type: "terminal", pane: s.pane }));
    head.append(open);
  }
  c.append(head, el("pre"));
  if (!s.pane) { c.querySelector("pre").textContent = "This session does not run in tmux, so prompts cannot be sent to it."; return c; }
  const ta = el("textarea"); ta.placeholder = "Prompt for " + s.name; ta.value = drafts[s.pane] || "";
  const btn = el("button", null, "Send"); const msg = el("div", "msg");
  const send = () => { const text = ta.value.trim(); if (!text) return; btn.disabled = true; msg.textContent = "sending";
    vscode.postMessage({ type: "send", pane: s.pane, text }); };
  ta.addEventListener("input", () => { drafts[s.pane] = ta.value; vscode.setState(drafts); });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
  btn.addEventListener("click", send);
  const row = el("div", "row"); row.append(el("span", "hint", "Ctrl+Enter to send"), btn);
  c.append(ta, row, msg);
  return c;
}

window.addEventListener("message", ({ data }) => {
  if (data.type === "project") {
    root.replaceChildren();
    if (!data.project) { root.append(el("p", "empty", "Open a file in a project to see its sessions.")); return; }
    root.append(el("h3", null, data.project.label + "  (" + data.project.sessions.length + ")"));
    if (!data.project.sessions.length) root.append(el("p", "empty", "No Claude session is running in this project."));
    for (const s of data.project.sessions) root.append(card(s));
  } else if (data.type === "status") {
    const c = root.querySelector('.card[data-pane="' + CSS.escape(data.pane) + '"]'); if (!c) return;
    const st = c.querySelector(".state"); st.textContent = data.busy ? "working" : "idle"; st.className = "state " + (data.busy ? "busy" : "idle");
    const pre = c.querySelector("pre"); const atEnd = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 4;
    pre.textContent = data.tail; if (atEnd) pre.scrollTop = pre.scrollHeight;
  } else if (data.type === "sent") {
    const c = root.querySelector('.card[data-pane="' + CSS.escape(data.pane) + '"]'); if (!c) return;
    c.querySelector(".row button").disabled = false;
    c.querySelector(".msg").textContent = data.error ? "Failed: " + data.error : "Sent to the session.";
    if (!data.error) { c.querySelector("textarea").value = ""; delete drafts[data.pane]; vscode.setState(drafts); }
  }
});
vscode.postMessage({ type: "ready" });
</script></body></html>`;
}

module.exports = { render };
