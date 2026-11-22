// Turns comments into per-line text pieces with the comment syntax stripped: the token of a line
// comment (and repeats like `///`, `##`, `--!`), block delimiters, and the leading ` * ` decoration
// of block-comment continuation lines. Pieces are grouped so a `$$` block can span several lines:
// consecutive line comments form one group, each block comment or docstring its own.

function lineIndex(text) {
  const starts = [0];
  for (let k = text.indexOf("\n"); k >= 0; k = text.indexOf("\n", k + 1)) starts.push(k + 1);
  return starts;
}

function lineOf(starts, offset) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// True when only whitespace precedes `offset` on its line.
function ownLine(text, starts, line, offset) {
  for (let k = starts[line]; k < offset; k++) if (text[k] !== " " && text[k] !== "\t") return false;
  return true;
}

function linePiece(text, starts, c) {
  const tail = c.open[c.open.length - 1];
  let a = c.start + c.open.length;
  while (a < c.end && (text[a] === tail || text[a] === "!")) a++;
  const line = lineOf(starts, c.start);
  return { line, start: a, end: c.end, ownLine: ownLine(text, starts, line, c.start) };
}

function blockPieces(text, starts, c) {
  const out = [];
  let a = c.start + c.open.length;
  const b = c.end - c.close.length;
  const star = c.open === "/*" || c.open === "(*";
  if (star) while (a < b && (text[a] === "*" || text[a] === "!")) a++;
  let line = lineOf(starts, c.start), first = true;
  while (a <= b) {
    let e = text.indexOf("\n", a);
    if (e < 0 || e > b) e = b;
    let s = a;
    if (!first) {
      while (s < e && (text[s] === " " || text[s] === "\t")) s++;
      if (star && text[s] === "*" && text[s + 1] !== "/" && text[s + 1] !== ")") s++;
    }
    const end = text[e - 1] === "\r" ? e - 1 : e;
    out.push({ line, start: s, end: Math.max(s, end), ownLine: first ? ownLine(text, starts, line, c.start) : true });
    if (e >= b) break;
    a = e + 1;
    line++;
    first = false;
  }
  return out;
}

// comments: lexer output, in document order. Returns an array of groups (arrays of pieces).
function groupPieces(text, comments) {
  const starts = lineIndex(text), groups = [];
  let run = null, prev = null;
  for (const c of comments) {
    if (c.kind !== "line") {
      run = null;
      groups.push(blockPieces(text, starts, c));
      continue;
    }
    const p = linePiece(text, starts, c);
    if (run && prev && prev.open === c.open && run[run.length - 1].line === p.line - 1) run.push(p);
    else groups.push((run = [p]));
    prev = c;
  }
  return { groups, starts };
}

module.exports = { groupPieces, lineIndex, lineOf };
