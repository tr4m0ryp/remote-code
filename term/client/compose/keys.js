// Compose-mode key routing: which keys typed in the strip go straight to the pty, as which bytes.
// Always: Esc, Ctrl+C (unless text is selected, then it copies), Ctrl+D, Ctrl+L, Shift+Tab, Alt+key
// and every Ctrl+letter the strip does not use itself (A, V, X, Y, Z). Only with an empty strip:
// arrows, Tab and Backspace (Enter is handled by the strip). y/n/digits stay in the strip so a
// prompt may start with them; Claude's own choice prompts switch the window to direct mode anyway.
const STRIP_CTRL = new Set(["a", "v", "x", "y", "z"]);

function arrow(term, k) {
  return (term.modes.applicationCursorKeysMode ? "\x1bO" : "\x1b[") + k;
}

// Returns bytes for the pty, "" when the key was consumed locally (copy), or null to let the
// textarea handle it.
RT.ptyKey = function (e, { empty, term, input }) {
  const plainMods = !e.ctrlKey && !e.altKey && !e.metaKey;
  if (e.key === "Escape" && plainMods && !e.shiftKey) return "\x1b";
  if (e.key === "Tab" && e.shiftKey && plainMods) return "\x1b[Z";
  if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && /^[a-z]$/i.test(e.key)) {
    const k = e.key.toLowerCase();
    if (k === "c") {
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        term.clearSelection();
        return "";
      }
      if (input.selectionStart !== input.selectionEnd) return null; // copy from the strip
      return "\x03";
    }
    if (STRIP_CTRL.has(k)) return null;
    return String.fromCharCode(k.charCodeAt(0) & 0x1f);
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) return "\x1b" + e.key;
  if (!empty || !plainMods || e.shiftKey) return null;
  switch (e.key) {
    case "ArrowUp": return arrow(term, "A");
    case "ArrowDown": return arrow(term, "B");
    case "ArrowRight": return arrow(term, "C");
    case "ArrowLeft": return arrow(term, "D");
    case "Tab": return "\t";
    case "Backspace": return "\x7f";
    default: return null;
  }
};
