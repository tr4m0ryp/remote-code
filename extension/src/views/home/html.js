// Static markup for the Home page. Only the CSP nonce is interpolated; all data arrives via postMessage.
const { SCRIPT } = require("./script");

function render(nonce, cspSource) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { padding: 16px 24px; max-width: 860px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
         color: var(--vscode-foreground); }
  header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  h1 { font-size: 1.4em; font-weight: 600; margin: 0; }
  h2 { font-size: 1.05em; font-weight: 600; margin: 18px 0 6px; }
  h3 { font-size: .8em; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; opacity: .7; margin: 12px 0 6px; }
  .muted, .sub { opacity: .65; font-size: .9em; }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;
          background: var(--vscode-editorWidget-background); }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { font-size: .88em; opacity: .8; margin-top: 3px; }
  .sessions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .chip { font-size: .85em; padding: 1px 8px; border-radius: 10px; background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground); display: inline-flex; align-items: center; gap: 5px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--vscode-disabledForeground); }
  .chip.busy .dot { background: var(--vscode-charts-yellow); }
  .chip.idle .dot { background: var(--vscode-charts-green); }
  ul.files { list-style: none; padding: 0; margin: 6px 0 0; font-size: .9em; }
  ul.files li { display: flex; justify-content: space-between; gap: 10px; padding: 1px 0; }
  ul.files a { color: var(--vscode-textLink-foreground); text-decoration: none; overflow: hidden; text-overflow: ellipsis;
               white-space: nowrap; font-family: var(--vscode-editor-font-family); }
  ul.files a:hover { text-decoration: underline; }
  .when { opacity: .6; white-space: nowrap; }
  button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; border-radius: 3px;
           padding: 3px 12px; cursor: pointer; font-family: inherit; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.link { background: none; color: var(--vscode-textLink-foreground); padding: 0; }
  button.row { display: flex; width: 100%; gap: 12px; align-items: baseline; text-align: left; background: none;
               color: inherit; padding: 4px 6px; border-radius: 3px; }
  button.row:hover { background: var(--vscode-list-hoverBackground); }
  button.row .name { min-width: 160px; font-weight: 500; }
</style></head>
<body>
<header><h1>Home</h1><span class="sub" id="updated">loading</span><button class="link" id="reload">refresh</button></header>
<h2>Recommended to open</h2>
<div id="working" hidden></div>
<div id="recent" hidden></div>
<p class="muted" id="none" hidden>No project is being worked on or was added recently.</p>
<h2>All projects</h2>
<div id="all"></div>
<script nonce="${nonce}">${SCRIPT}</script>
</body></html>`;
}

module.exports = { render };
