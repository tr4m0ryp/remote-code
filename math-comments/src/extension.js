// Entry point: renders LaTeX written in code comments ($...$, $$...$$, \(...\), \[...\]) in place,
// with a hover showing the formula large. Command "Math Comments: Toggle Rendering".
const vscode = require("vscode");
const { Controller, hoverProvider } = require("./decorate");
const { clearCache } = require("./render");

function activate(context) {
  const ctl = new Controller();
  const w = vscode.window, ws = vscode.workspace;
  context.subscriptions.push(
    ctl,
    vscode.languages.registerHoverProvider({ pattern: "**" }, hoverProvider(ctl)),
    vscode.commands.registerCommand("mathComments.toggle", async () => {
      const cfg = ws.getConfiguration("mathComments");
      await cfg.update("enabled", !cfg.get("enabled", true), vscode.ConfigurationTarget.Global);
    }),
    w.onDidChangeVisibleTextEditors(() => ctl.refreshAll()),
    w.onDidChangeTextEditorSelection((e) => ctl.refresh(e.textEditor)),
    w.onDidChangeTextEditorVisibleRanges((e) => ctl.refresh(e.textEditor)),
    w.onDidChangeActiveColorTheme(() => { clearCache(); ctl.refreshAll(true); }),
    ws.onDidChangeTextDocument((e) => { if (e.contentChanges.length) ctl.documentChanged(e.document); }),
    ws.onDidCloseTextDocument((d) => ctl.documentClosed(d)),
    ws.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("mathComments") || e.affectsConfiguration("editor.fontSize") || e.affectsConfiguration("editor.lineHeight")) {
        clearCache();
        ctl.refreshAll(true);
      }
    })
  );
  ctl.refreshAll(true);
}

function deactivate() {}

module.exports = { activate, deactivate };
