// Keeps math decorations in sync with visible editors. Each math range is hidden (display: none)
// and replaced by a `before` injected image of the rendered SVG; math touched by a cursor or
// selection is left raw so it stays editable. Scans are cached per document version and redone
// 150 ms after the last edit; only lines near the viewport are decorated, at most MAX_ITEMS.
const vscode = require("vscode");
const { detectMath } = require("../scan");
const { renderImage } = require("../render");
const { currentStyle } = require("./style");

const SCAN_DELAY = 150, MARGIN = 100, MAX_ITEMS = 600;

class Controller {
  constructor() {
    this.scans = new Map(); // uri -> { version, items }
    this.pending = new Map(); // uri -> timer
    this.last = new WeakMap(); // editor -> signature of the last applied decoration set
    this.hidden = vscode.window.createTextEditorDecorationType({
      textDecoration: "none; display: none;",
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    this.invalid = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline dotted rgba(229, 115, 115, 0.7)",
    });
  }

  itemsFor(document) {
    const key = document.uri.toString();
    const hit = this.scans.get(key);
    if (hit && hit.version === document.version) return hit.items;
    const text = document.getText();
    const items = text.length > currentStyle().maxChars ? [] : detectMath(text, document.languageId);
    this.scans.set(key, { version: document.version, items });
    return items;
  }

  documentChanged(document) {
    const key = document.uri.toString();
    clearTimeout(this.pending.get(key));
    this.pending.set(key, setTimeout(() => {
      this.pending.delete(key);
      for (const ed of vscode.window.visibleTextEditors) if (ed.document === document) this.refresh(ed);
    }, SCAN_DELAY));
  }

  documentClosed(document) {
    this.scans.delete(document.uri.toString());
  }

  refreshAll(force) {
    for (const ed of vscode.window.visibleTextEditors) this.refresh(ed, force);
  }

  // Called on cursor moves and scrolls too; skips while a rescan is pending (offsets are stale).
  refresh(editor, force) {
    const doc = editor.document;
    if (this.pending.has(doc.uri.toString())) return;
    const style = currentStyle();
    if (!style.enabled || doc.uri.scheme === "output") return this.clear(editor);
    const items = this.itemsFor(doc);
    const [lo, hi] = this.window(editor);
    const sel = editor.selections.map((s) => [doc.offsetAt(s.start), doc.offsetAt(s.end)]);
    const shown = [], touched = [];
    for (const m of items) {
      if (m.endLine < lo || m.line > hi) continue;
      if (shown.length >= MAX_ITEMS) break;
      if (sel.some(([a, b]) => a <= m.end && b >= m.start)) touched.push(m.start);
      else shown.push(m);
    }
    const sig = `${doc.version}|${lo}|${hi}|${touched.join(",")}|${shown.length}|${style.color}|${style.exPx}|${style.lineHeight}`;
    if (!force && this.last.get(editor) === sig) return;
    this.last.set(editor, sig);
    this.apply(editor, shown, style);
  }

  // Decorated line window: the visible ranges widened by MARGIN lines.
  window(editor) {
    const vr = editor.visibleRanges;
    if (!vr.length) return [0, MARGIN];
    return [Math.max(0, vr[0].start.line - MARGIN), vr[vr.length - 1].end.line + MARGIN];
  }

  apply(editor, items, style) {
    const doc = editor.document, hidden = [], invalid = [];
    const range = (a, b) => new vscode.Range(doc.positionAt(a), doc.positionAt(b));
    for (const m of items) {
      const lines = m.block ? m.endLine - m.line + 1 : 1;
      const img = renderImage(m.tex, m.display, { color: style.color, exPx: style.exPx, maxHeight: lines * style.lineHeight });
      if (img.error) {
        invalid.push({ range: range(m.start, m.end) });
        continue;
      }
      const align = m.block || img.scaled ? "top" : `${img.valign}px`;
      const [first, ...rest] = m.hide;
      hidden.push({
        range: range(first[0], first[1]),
        renderOptions: {
          before: {
            contentIconPath: vscode.Uri.parse(img.uri),
            width: `${img.width}px`,
            height: `${img.height}px`,
            textDecoration: `none; vertical-align: ${align};`,
          },
        },
      });
      for (const [a, b] of rest) hidden.push({ range: range(a, b) });
    }
    editor.setDecorations(this.hidden, hidden);
    editor.setDecorations(this.invalid, invalid);
  }

  clear(editor) {
    this.last.delete(editor);
    editor.setDecorations(this.hidden, []);
    editor.setDecorations(this.invalid, []);
  }

  dispose() {
    for (const t of this.pending.values()) clearTimeout(t);
    this.hidden.dispose();
    this.invalid.dispose();
  }
}

module.exports = { Controller };
