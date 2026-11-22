// Comment and string syntax per VS Code languageId. VS Code does not expose TextMate scopes to
// extensions, so the lexer works from this table: line-comment tokens, block-comment pairs, and the
// string quotes it must skip so that `#` or `//` inside a string never starts a comment.

const isWord = (ch) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);

// `#` starts a comment only at a word boundary in shell-like languages (`a#b`, `$#`, `${#x}` are code).
const hashGuard = (text, i) => i === 0 || /[\s;|&()]/.test(text[i - 1]);
// Perl: `$#array` is code.
const perlGuard = (text, i) => text[i - 1] !== "$";
// Makefile, LaTeX: a backslash escapes the comment character.
const unescaped = (text, i) => text[i - 1] !== "\\";

// `'` opens a char literal only in the shape 'x' or '\n' (Rust lifetimes, Haskell x', OCaml 'a are code).
function charLiteral(text, i) {
  if (text[i + 1] === "\\") {
    const close = text.indexOf("'", i + 2);
    return close > 0 && close - i <= 12 && !text.slice(i, close).includes("\n");
  }
  return text[i + 1] !== "'" && text[i + 1] !== "\n" && text[i + 2] === "'";
}
// `'` after an operand is the transpose operator (MATLAB, Julia).
const notTranspose = (text, i) => !(isWord(text[i - 1]) || /[)\]}'.]/.test(text[i - 1] || ""));

const DQ = { ch: '"', escape: true };
const SQ = { ch: "'", escape: true };
const BT = { ch: "`", escape: true, multiline: true };
const CHAR = { ch: "'", escape: true, guard: charLiteral };
const C_BLOCK = { open: "/*", close: "*/" };

const cLike = { line: ["//"], block: [C_BLOCK], quotes: [DQ, SQ] };
const jsLike = { line: ["//"], block: [C_BLOCK], quotes: [DQ, SQ, BT] };
const hashLike = { line: ["#"], quotes: [DQ, SQ] };
const markup = { block: [{ open: "<!--", close: "-->" }], quotes: [] };
const mlLike = { block: [{ open: "(*", close: "*)", nested: true }], quotes: [DQ, CHAR] };
const semi = { line: [";"], quotes: [DQ] };

const LANGS = {
  c: cLike, cpp: cLike, "cuda-cpp": cLike, csharp: cLike, java: cLike, "objective-c": cLike,
  "objective-cpp": cLike, glsl: cLike, hlsl: cLike, wgsl: cLike, jsonc: cLike, json: cLike,
  scss: cLike, less: cLike, css: { block: [C_BLOCK], quotes: [DQ, SQ] },
  javascript: jsLike, javascriptreact: jsLike, typescript: jsLike, typescriptreact: jsLike,
  dart: jsLike, groovy: jsLike,
  go: { line: ["//"], block: [C_BLOCK], quotes: [DQ, CHAR, { ch: "`", multiline: true }] },
  rust: { line: ["//"], block: [{ ...C_BLOCK, nested: true }], quotes: [DQ, CHAR], rawRust: true },
  swift: { ...cLike, triple: ['"""'] },
  kotlin: { ...cLike, triple: ['"""'] },
  scala: { ...cLike, triple: ['"""'] },
  php: { line: ["//", "#"], block: [C_BLOCK], quotes: [DQ, SQ] },
  python: { line: ["#"], quotes: [DQ, SQ], triple: ['"""', "'''"], docstring: true },
  julia: {
    line: ["#"], block: [{ open: "#=", close: "=#", nested: true }], triple: ['"""'], docstring: true,
    quotes: [DQ, { ch: "'", escape: true, guard: (t, i) => notTranspose(t, i) && charLiteral(t, i) }],
  },
  r: hashLike, elixir: { ...hashLike, triple: ['"""'], docstring: true }, nim: hashLike,
  ruby: { line: ["#"], block: [{ open: "=begin", close: "=end", lineStart: true }], quotes: [DQ, SQ] },
  shellscript: {
    line: ["#"], lineGuard: hashGuard,
    quotes: [{ ch: '"', escape: true, multiline: true }, { ch: "'", multiline: true }],
  },
  powershell: { line: ["#"], block: [{ open: "<#", close: "#>" }], quotes: [DQ, { ch: "'" }] },
  perl: { line: ["#"], lineGuard: perlGuard, quotes: [DQ, SQ] },
  lua: { line: ["--"], block: [{ open: "--[[", close: "]]" }], quotes: [DQ, SQ] },
  sql: { line: ["--"], block: [C_BLOCK], quotes: [DQ, SQ] },
  haskell: { line: ["--"], block: [{ open: "{-", close: "-}", nested: true }], quotes: [DQ, CHAR] },
  latex: { line: ["%"], lineGuard: unescaped, quotes: [] },
  tex: { line: ["%"], lineGuard: unescaped, quotes: [] },
  bibtex: { line: ["%"], lineGuard: unescaped, quotes: [] },
  matlab: {
    line: ["%"], block: [{ open: "%{", close: "%}", lineStart: true }],
    quotes: [DQ, { ch: "'", guard: notTranspose }],
  },
  erlang: { line: ["%"], quotes: [DQ] },
  yaml: { line: ["#"], lineGuard: hashGuard, quotes: [DQ, SQ] },
  toml: { line: ["#"], quotes: [DQ, SQ], triple: ['"""', "'''"] },
  ini: { line: [";", "#"], quotes: [] }, properties: { line: ["#", "!"], quotes: [] },
  dockerfile: { line: ["#"], lineGuard: hashGuard, quotes: [DQ, SQ] },
  makefile: { line: ["#"], lineGuard: unescaped, quotes: [] },
  cmake: { line: ["#"], quotes: [DQ] },
  html: markup, xml: markup, xsl: markup, svg: markup, markdown: markup,
  vue: { line: ["//"], block: [{ open: "<!--", close: "-->" }, C_BLOCK], quotes: [DQ, SQ, BT] },
  ocaml: mlLike, fsharp: { ...mlLike, line: ["//"] },
  clojure: semi, scheme: semi, racket: semi, lisp: semi, asm: semi, "asm-intel-x86-generic": semi,
};

// Unknown languages: the common C, shell and script comment forms.
const FALLBACK = { line: ["//", "#"], lineGuard: hashGuard, block: [C_BLOCK], quotes: [DQ, SQ] };

function languageSpec(languageId) {
  return LANGS[languageId] || FALLBACK;
}

module.exports = { languageSpec, LANGS, FALLBACK, isWord };
