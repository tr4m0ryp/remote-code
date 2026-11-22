// MathJax rendering: sizing, colouring, scaling to the line, and error reporting.
const test = require("node:test");
const assert = require("node:assert");
const { renderImage } = require("../src/render");

const opts = { color: "#cccccc", exPx: 7, maxHeight: 19 };
const svgOf = (img) => Buffer.from(img.uri.split(",")[1], "base64").toString();

test("renders inline TeX to a coloured, px-sized SVG data URI", () => {
  const img = renderImage("c = 3\\sigma", false, opts);
  assert.ok(img.uri.startsWith("data:image/svg+xml;base64,"));
  const svg = svgOf(img);
  assert.ok(svg.includes('fill="#cccccc"') && !svg.includes("currentColor"));
  assert.match(svg, new RegExp(`width="${img.width}px" height="${img.height}px"`));
  assert.strictEqual(img.scaled, false);
});

test("tall formulas are scaled down to the available height", () => {
  const img = renderImage("\\frac{\\sum_{i=1}^n x_i}{\\sqrt{n}}", true, opts);
  assert.strictEqual(img.scaled, true);
  assert.strictEqual(img.height, 19);
});

test("invalid TeX reports an error instead of an image", () => {
  assert.match(renderImage("\\frac{a", false, opts).error, /brace/i);
  assert.match(renderImage("\\notamacro x", false, opts).error, /Undefined control sequence/);
});

test("bundle loads and activates against a stub vscode", (t) => {
  const fs = require("node:fs"), path = require("node:path");
  const dist = path.join(__dirname, "..", "dist", "extension.js");
  if (!fs.existsSync(dist)) return t.skip("run npm run build first");
  const Module = require("node:module");
  const orig = Module._load;
  Module._load = function (req, ...rest) { return req === "vscode" ? {} : orig.call(this, req, ...rest); };
  try {
    const ext = require(dist);
    assert.strictEqual(typeof ext.activate, "function");
  } finally {
    Module._load = orig;
  }
});
