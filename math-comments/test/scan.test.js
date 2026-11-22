// Comment lexer: strings vs comments across languages, block comments, docstrings.
const test = require("node:test");
const assert = require("node:assert");
const { scanComments, languageSpec } = require("../src/scan");

const comments = (text, lang) => scanComments(text, languageSpec(lang)).map((c) => text.slice(c.start, c.end));

test("python: # inside strings is not a comment", () => {
  const src = `s = "a # b"; t = 'c # d'  # real\nu = f"{x} # no"\n`;
  assert.deepStrictEqual(comments(src, "python"), ["# real"]);
});

test("python: docstrings count, assigned triple strings do not", () => {
  const src = `def f():\n    """doc $x$"""\n    y = """not # doc"""\n    r'''raw doc'''\n`;
  const cs = scanComments(src, languageSpec("python"));
  assert.deepStrictEqual(cs.map((c) => c.kind), ["doc", "doc"]);
  assert.strictEqual(src.slice(cs[0].start, cs[0].end), '"""doc $x$"""');
});

test("c: // and /* */ inside strings and char literals are ignored", () => {
  const src = `char *s = "// no /* no */"; char q = '"'; int a; // yes\n/* block\n * two */ x = '/';`;
  assert.deepStrictEqual(comments(src, "c"), ["// yes", "/* block\n * two */"]);
});

test("javascript: template literals span lines and hide comment tokens", () => {
  const src = "const a = `line1 // no\n /* no */`; // yes\nconst re = 'it\\'s // no';";
  assert.deepStrictEqual(comments(src, "javascript"), ["// yes"]);
});

test("shell: # only at word boundary, quotes skipped", () => {
  const src = `echo "a # b" 'c # d' x#y \${#arr} $# # real\nfoo;# two\n`;
  assert.deepStrictEqual(comments(src, "shellscript"), ["# real", "# two"]);
});

test("rust: lifetimes and raw strings do not derail the lexer", () => {
  const src = `fn f<'a>(x: &'a str) -> &'a str { r#"// no "quote""#; x } // yes\nlet c = '\\''; // two`;
  assert.deepStrictEqual(comments(src, "rust"), ["// yes", "// two"]);
});

test("nested and language-specific block comments", () => {
  assert.deepStrictEqual(comments("x (* a (* b *) c *) y", "ocaml"), ["(* a (* b *) c *)"]);
  assert.deepStrictEqual(comments("a <!-- $x$ --> b", "html"), ["<!-- $x$ -->"]);
  assert.deepStrictEqual(comments("x = 1 -- c\n--[[ long ]]", "lua"), ["-- c", "--[[ long ]]"]);
  assert.deepStrictEqual(comments("50\\% off % real", "latex"), ["% real"]);
  assert.deepStrictEqual(comments("a = b'; % t\ns = 'x % no';", "matlab"), ["% t"]);
});

test("unknown language falls back to //, /* */ and #", () => {
  assert.deepStrictEqual(comments("a // one\nb # two\n/* three */", "unknown-lang"), ["// one", "# two", "/* three */"]);
});

test("unterminated block comment runs to the end", () => {
  assert.deepStrictEqual(comments("x /* open", "c"), ["/* open"]);
});
