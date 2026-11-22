// Single-pass comment lexer: walks the document once, skipping string literals, and returns every
// comment as { kind: "line" | "block" | "doc", start, end, open, close }. Offsets cover the delimiters;
// `close` is "" for line comments and unterminated blocks. Linear time, no regex in the hot loop.
const { isWord } = require("./languages");

function lineStartAt(text, i) {
  let k = i - 1;
  while (k >= 0 && (text[k] === " " || text[k] === "\t")) k--;
  return k < 0 || text[k] === "\n";
}

function blockEnd(text, from, b) {
  if (!b.nested) {
    const k = text.indexOf(b.close, from);
    return k < 0 ? [text.length, false] : [k + b.close.length, true];
  }
  let depth = 1;
  for (let k = from; k < text.length; k++) {
    if (text.startsWith(b.close, k)) {
      if (--depth === 0) return [k + b.close.length, true];
      k += b.close.length - 1;
    } else if (text.startsWith(b.open, k)) {
      depth++;
      k += b.open.length - 1;
    }
  }
  return [text.length, false];
}

// Returns the index just past the closing quote (or the line end / EOF for an unterminated string).
function skipQuoted(text, i, q) {
  for (let k = i + 1; k < text.length; k++) {
    const ch = text[k];
    if (ch === "\\" && q.escape) k++;
    else if (ch === q.ch) return k + 1;
    else if (ch === "\n" && !q.multiline) return k;
  }
  return text.length;
}

function skipTriple(text, i, delim) {
  for (let k = i + 3; k < text.length; k++) {
    if (text[k] === "\\") k++;
    else if (text.startsWith(delim, k)) return [k + 3, true];
  }
  return [text.length, false];
}

// A docstring is a triple-quoted string in statement position: only whitespace and an optional
// string prefix (r, b, u, f) before it on its line.
function statementPosition(text, i) {
  let k = i - 1, prefix = 0;
  while (k >= 0 && /[rRbBuUfF]/.test(text[k]) && prefix < 2) { k--; prefix++; }
  if (prefix && isWord(text[k])) return false;
  return lineStartAt(text, k + 1);
}

// Rust raw strings r"..", r#".."#, br#".."#. Returns the end index or -1 when i is not one.
function skipRawRust(text, i) {
  if (isWord(text[i - 1]) && !(text[i - 1] === "b" && !isWord(text[i - 2]))) return -1;
  let k = i + 1, hashes = 0;
  while (text[k] === "#") { k++; hashes++; }
  if (text[k] !== '"') return -1;
  const close = text.indexOf('"' + "#".repeat(hashes), k + 1);
  return close < 0 ? text.length : close + 1 + hashes;
}

function firstChars(spec) {
  const set = new Set();
  for (const b of spec.block || []) set.add(b.open[0]);
  for (const t of spec.line || []) set.add(t[0]);
  for (const t of spec.triple || []) set.add(t[0]);
  for (const q of spec.quotes || []) set.add(q.ch);
  if (spec.rawRust) set.add("r");
  if (spec.lineGuard) set.add("\\");
  return set;
}

function scanComments(text, spec) {
  const out = [], n = text.length, starts = firstChars(spec);
  const blocks = spec.block || [], lines = spec.line || [], quotes = spec.quotes || [];
  let i = 0;
  outer: while (i < n) {
    const ch = text[i];
    if (!starts.has(ch)) { i++; continue; }
    for (const b of blocks) {
      if (text.startsWith(b.open, i) && (!b.lineStart || lineStartAt(text, i))) {
        const [end, closed] = blockEnd(text, i + b.open.length, b);
        out.push({ kind: "block", start: i, end, open: b.open, close: closed ? b.close : "" });
        i = end;
        continue outer;
      }
    }
    for (const t of lines) {
      if (text.startsWith(t, i) && (!spec.lineGuard || spec.lineGuard(text, i))) {
        let end = text.indexOf("\n", i);
        if (end < 0) end = n;
        if (text[end - 1] === "\r") end--;
        out.push({ kind: "line", start: i, end, open: t, close: "" });
        i = end;
        continue outer;
      }
    }
    for (const t of spec.triple || []) {
      if (text.startsWith(t, i)) {
        const [end, closed] = skipTriple(text, i, t);
        if (spec.docstring && statementPosition(text, i)) {
          out.push({ kind: "doc", start: i, end, open: t, close: closed ? t : "" });
        }
        i = end;
        continue outer;
      }
    }
    if (spec.rawRust && ch === "r") {
      const end = skipRawRust(text, i);
      if (end > 0) { i = end; continue; }
    }
    const q = quotes.find((x) => x.ch === ch);
    if (q && (!q.guard || q.guard(text, i))) { i = skipQuoted(text, i, q); continue; }
    i += ch === "\\" ? 2 : 1;
  }
  return out;
}

module.exports = { scanComments };
