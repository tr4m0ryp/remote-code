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
  button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  button:disabled { opacity: .5; cursor: default; }
  .empty { opacity: .7; padding: 0 10px; }
  .row { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 10px 0 12px; cursor: pointer; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.notmux { cursor: default; opacity: .6; }
  .pet { position: relative; flex: none; width: 54px; height: 30px; }
  .clawd { display: block; width: 54px; height: 30px; fill: rgb(215, 119, 87); }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2px; line-height: 1.25; }
  .line { display: flex; align-items: baseline; gap: 5px; min-width: 0; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .spinner { flex: none; color: rgb(255, 153, 51); width: 1em; }
  .stats { font-size: .82em; color: var(--vscode-descriptionForeground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .word.working { color: rgb(255, 153, 51); }
  .word.sleeping { opacity: .6; }
  .stats .min { opacity: .7; font-style: italic; }
  .row.minimised .name { opacity: .75; }
  .zzz { display: none; position: absolute; left: 50px; top: -3px; font-size: 9px; font-weight: 600;
         color: var(--vscode-descriptionForeground); }
  .row[data-state="sleeping"] .zzz { display: block; animation: zfloat 2.4s ease-in infinite; }
  @keyframes zfloat { 0% { opacity: 0; transform: translate(0, 10px) scale(.7); } 30% { opacity: 1; }
                      100% { opacity: 0; transform: translate(6px, -4px) scale(1.15); } }
  @media (prefers-reduced-motion: reduce) { .row[data-state="sleeping"] .zzz { animation: none; } }
</style></head>
<body><div id="root"></div>
${tags}
</body></html>`;
}

module.exports = { render };
