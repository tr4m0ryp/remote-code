// Markup and styles for the "Sessions" panel; behaviour lives in media/sessions/{clawd,panel}.js.
// Nothing is interpolated into the HTML except the CSP nonce and script URIs, so session names and
// pane output cannot inject markup.
function render(nonce, cspSource, scripts) {
  const tags = scripts.map((src) => `<script nonce="${nonce}" src="${src}"></script>`).join("\n");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}' ${cspSource};">
<style nonce="${nonce}">
  body { padding: 4px 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 0 10px 4px; }
  .label { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; border-radius: 2px;
           padding: 2px 8px; cursor: pointer; white-space: nowrap; font-family: inherit; font-size: .9em; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .empty { opacity: .7; padding: 0 10px; }
  .row { display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 10px; cursor: pointer; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.notmux { cursor: default; opacity: .6; }
  .pet { position: relative; flex: none; width: 34px; height: 20px; }
  .clawd { margin: 0; font-family: "DejaVu Sans Mono", Menlo, Consolas, monospace; font-size: 6.5px; line-height: 1;
           letter-spacing: 0; color: rgb(215, 119, 87); white-space: pre; }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; line-height: 1.2; }
  .line { display: flex; align-items: baseline; gap: 4px; min-width: 0; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .spinner { flex: none; color: rgb(255, 153, 51); width: 1em; }
  .stats { font-size: .8em; color: var(--vscode-descriptionForeground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row[data-state="working"] .stats { color: rgb(255, 153, 51); }
  .zzz { display: none; position: absolute; left: 30px; top: -2px; font-size: 8px; font-weight: 600;
         color: var(--vscode-descriptionForeground); }
  .row[data-state="sleeping"] .zzz { display: block; animation: zfloat 2.4s ease-in infinite; }
  @keyframes zfloat { 0% { opacity: 0; transform: translate(0, 8px) scale(.7); } 30% { opacity: 1; }
                      100% { opacity: 0; transform: translate(5px, -4px) scale(1.15); } }
  @media (prefers-reduced-motion: reduce) { .row[data-state="sleeping"] .zzz { animation: none; } }
</style></head>
<body><div id="root"></div>
${tags}
</body></html>`;
}

module.exports = { render };
