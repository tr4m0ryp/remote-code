// Math detection inside comment pieces. Inline: $...$ and \(...\). Display: $$...$$ or \[...\] on one
// line, or `$$` / `\[` alone on a comment line opening a block that a later `$$` / `\]` line closes.
// Dollar rules follow pandoc (no whitespace just inside the dollars, closing `$` not followed by a
// digit), tightened for code: neither dollar may touch a word character, so $HOME, a$b, $5 and $10,
// $HOME/$USER and ${VAR} stay text.
const { isWord } = require("./languages");

const space = (ch) => ch === " " || ch === "\t";
const SHELL_VAR = /^\{[A-Za-z_][A-Za-z0-9_]*\}$/;

// Index of the closing `$` for an inline opener at k, or -1.
function inlineClose(s, k) {
  if (k > 0 && (isWord(s[k - 1]) || s[k - 1] === "$")) return -1;
  const next = s[k + 1];
  if (next === undefined || space(next) || next === "$") return -1;
  for (let j = k + 1; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] !== "$") continue;
    if (space(s[j - 1]) || isWord(s[j + 1]) || s[j + 1] === "$") return -1;
    return SHELL_VAR.test(s.slice(k + 1, j)) ? -1 : j;
  }
  return -1;
}

// Finds single-line math in piece text s; base is the document offset of s[0].
function scanLine(s, base, line, out) {
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\") {
      const kind = s[k + 1];
      if (kind === "(" || kind === "[") {
        const close = s.indexOf(kind === "(" ? "\\)" : "\\]", k + 2);
        const tex = close > 0 ? s.slice(k + 2, close).trim() : "";
        if (tex) {
          out.push(item(base + k, base + close + 2, tex, kind === "[", line));
          k = close + 1;
          continue;
        }
      }
      k++;
      continue;
    }
    if (ch !== "$") continue;
    if (s[k + 1] === "$") {
      const close = s.indexOf("$$", k + 2);
      const tex = close > 0 ? s.slice(k + 2, close).trim() : "";
      if (tex) out.push(item(base + k, base + close + 2, tex, true, line));
      k = close > 0 ? close + 1 : k + 1;
      continue;
    }
    const close = inlineClose(s, k);
    if (close < 0) continue;
    out.push(item(base + k, base + close + 1, s.slice(k + 1, close), false, line));
    k = close;
  }
}

function item(start, end, tex, display, line) {
  return { start, end, tex, display, block: false, line, endLine: line, anchor: start, hide: [[start, end]] };
}

// Start of the hidden part of a block line: the whole line when the comment owns it.
function hideFrom(text, starts, p) {
  if (!p.ownLine) return p.start;
  let k = starts[p.line];
  while (k < p.start && space(text[k])) k++;
  return k;
}

const OPEN = { $$: "$$", "\\[": "\\]" };

function findMath(text, groups, starts) {
  const out = [];
  for (const group of groups) {
    for (let g = 0; g < group.length; g++) {
      const p = group[g];
      const raw = text.slice(p.start, p.end);
      const trimmed = raw.trim();
      const close = OPEN[trimmed];
      if (close) {
        const j = group.findIndex((q, idx) => idx > g && text.slice(q.start, q.end).trim() === close);
        if (j > g + 1) {
          const body = group.slice(g + 1, j);
          const tex = body.map((q) => text.slice(q.start, q.end).trim()).join("\n").trim();
          const openAt = p.start + raw.indexOf(trimmed);
          const last = group[j], lastRaw = text.slice(last.start, last.end);
          const closeEnd = last.start + lastRaw.indexOf(close) + close.length;
          if (tex) {
            out.push({
              start: openAt, end: closeEnd, tex, display: true, block: true, line: p.line, endLine: last.line,
              anchor: openAt,
              hide: [[openAt, p.end], ...body.map((q) => [hideFrom(text, starts, q), q.end]), [hideFrom(text, starts, last), closeEnd]],
            });
            g = j;
            continue;
          }
        }
      }
      scanLine(raw, p.start, p.line, out);
    }
  }
  return out;
}

module.exports = { findMath, scanLine, inlineClose };
