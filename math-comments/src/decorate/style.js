// Editor metrics and theme colour that rendered math has to match: font size, line height, and the
// editor foreground of the active theme kind (extensions cannot read theme colour values directly).
const vscode = require("vscode");

// Default foregrounds of the built-in Modern / High Contrast themes, by ColorThemeKind.
const FOREGROUND = { 1: "#3b3b3b", 2: "#cccccc", 3: "#ffffff", 4: "#292929" };

function currentStyle() {
  const cfg = vscode.workspace.getConfiguration("mathComments");
  const editor = vscode.workspace.getConfiguration("editor");
  const fontSize = editor.get("fontSize") || 14;
  let lineHeight = editor.get("lineHeight") || 0;
  if (lineHeight <= 0) lineHeight = Math.round(fontSize * 1.35);
  else if (lineHeight < 8) lineHeight = Math.round(lineHeight * fontSize);
  const scale = cfg.get("scale") || 1;
  const color = cfg.get("color") || FOREGROUND[vscode.window.activeColorTheme.kind] || FOREGROUND[2];
  return {
    enabled: cfg.get("enabled", true),
    maxChars: cfg.get("maxFileChars", 3000000),
    fontSize, lineHeight, color,
    exPx: Math.round(fontSize * 0.5 * scale * 100) / 100,
    hoverScale: cfg.get("hoverScale", 2.2),
  };
}

module.exports = { currentStyle };
