// Terminal look: VS Code Dark Modern colours and the editor's own font when the workbench exposes it.
const FALLBACK_FONT = 'Menlo, Monaco, Consolas, "Droid Sans Mono", "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';

function cssVar(name) {
  const wb = document.querySelector(".monaco-workbench");
  return wb ? getComputedStyle(wb).getPropertyValue(name).trim() : "";
}

RT.theme = {
  colors: {
    background: "#181818",
    foreground: "#cccccc",
    cursor: "#aeafad",
    cursorAccent: "#181818",
    selectionBackground: "#264f78",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#e5e5e5",
  },
  font() {
    return cssVar("--vscode-editor-font-family") || FALLBACK_FONT;
  },
  fontSize() {
    const n = parseInt(cssVar("--vscode-editor-font-size"), 10);
    return n >= 8 && n <= 32 ? n : 13;
  },
};
