// Math detection in comments: positives from the convention, negatives that must stay text.
const test = require("node:test");
const assert = require("node:assert");
const { detectMath } = require("../src/scan");

const texs = (text, lang) => detectMath(text, lang).map((m) => [m.tex, m.display]);

test("inline $...$ in a C line comment", () => {
  assert.deepStrictEqual(texs("x = clip(x); // clip to $[-c, c]$ where $c = 3\\sigma$\n", "c"), [
    ["[-c, c]", false], ["c = 3\\sigma", false],
  ]);
});

test("single-line $$...$$ display in a Python comment", () => {
  const src = "# $$w_{t+1} = w_t - \\eta \\, \\hat m_t / (\\sqrt{\\hat v_t} + \\epsilon)$$\n";
  assert.deepStrictEqual(texs(src, "python"), [["w_{t+1} = w_t - \\eta \\, \\hat m_t / (\\sqrt{\\hat v_t} + \\epsilon)", true]]);
});

test("multi-line $$ block across line comments strips the prefixes", () => {
  const src = "x = 1\n#  $$\n#  a = b \\\\\n#  c = d\n#  $$\ny = 2\n";
  const [m] = detectMath(src, "python");
  assert.deepStrictEqual([m.tex, m.block, m.line, m.endLine], ["a = b \\\\\nc = d", true, 1, 4]);
  assert.deepStrictEqual(m.hide.map(([a, b]) => src.slice(a, b)), ["$$", "#  a = b \\\\", "#  c = d", "#  $$"]);
});

test("multi-line block inside /* */ with star decoration, and \\[ \\] blocks", () => {
  const src = "/*\n * $$\n * E = mc^2\n * $$\n */\n// \\[\n// x^2\n// \\]\n";
  assert.deepStrictEqual(texs(src, "c"), [["E = mc^2", true], ["x^2", true]]);
});

test("\\(...\\) and \\[...\\] on one line", () => {
  assert.deepStrictEqual(texs("// see \\(\\alpha\\) and \\[\\beta\\]", "javascript"), [["\\alpha", false], ["\\beta", true]]);
});

test("math in Python docstrings and block comments of other languages", () => {
  const py = 'def f():\n    """Returns $\\sum_i x_i$."""\n';
  assert.deepStrictEqual(texs(py, "python"), [["\\sum_i x_i", false]]);
  assert.deepStrictEqual(texs("(* area $\\pi r^2$ *)", "ocaml"), [["\\pi r^2", false]]);
  assert.deepStrictEqual(texs("<!-- $e^{i\\pi}$ -->", "html"), [["e^{i\\pi}", false]]);
  assert.deepStrictEqual(texs("SELECT 1; -- $x_1$", "sql"), [["x_1", false]]);
});

test("negatives stay text", () => {
  const cases = [
    "# cd $HOME and run", "# costs $5 and $10", "# $ x $", "# a$b", "# $HOME/$USER",
    "# ${HOME}/x/${USER}", "# echo $a$b", "# price $5$ no", "# escaped \\$x\\$",
  ];
  for (const c of cases) assert.deepStrictEqual(texs(c, "shellscript"), [], c);
});

test("dollar math in strings is ignored", () => {
  assert.deepStrictEqual(texs('s = "$x$"  # $y$\n', "python"), [["y", false]]);
  assert.deepStrictEqual(texs('printf("$$a$$"); // $b$', "c"), [["b", false]]);
});

test("unclosed $$ block yields nothing", () => {
  assert.deepStrictEqual(texs("# $$\n# a = b\nx = 1\n", "python"), []);
});
