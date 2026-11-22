// MathJax 3 TeX -> SVG in the extension host. Loaded lazily on first use (it is the heavy part of
// activation). Throws on invalid TeX, including undefined macros, so callers can show the error.
let doc = null, adaptor = null;

function init() {
  const { mathjax } = require("mathjax-full/js/mathjax.js");
  const { TeX } = require("mathjax-full/js/input/tex.js");
  const { SVG } = require("mathjax-full/js/output/svg.js");
  const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
  const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
  const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");
  adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  // noerrors/noundefined would render bad input in red instead of failing; bussproofs needs a DOM.
  const skip = new Set(["noerrors", "noundefined", "bussproofs"]);
  const tex = new TeX({
    packages: AllPackages.filter((p) => !skip.has(p)),
    formatError: (_jax, err) => { throw err; },
  });
  doc = mathjax.document("", { InputJax: tex, OutputJax: new SVG({ fontCache: "local" }) });
}

const num = (svg, re) => { const m = re.exec(svg); return m ? parseFloat(m[1]) : 0; };

// Returns { svg, wEx, hEx, vaEx }: the bare <svg> markup and its size in ex units.
function texToSvg(tex, display) {
  if (!doc) init();
  const node = doc.convert(tex, { display });
  const svg = adaptor.innerHTML(node);
  const err = /data-mjx-error="([^"]*)"/.exec(svg);
  if (err || svg.includes('data-mml-node="merror"')) throw new Error(err ? err[1] : "TeX error");
  return {
    svg,
    wEx: num(svg, /width="([\d.]+)ex"/),
    hEx: num(svg, /height="([\d.]+)ex"/),
    vaEx: num(svg, /vertical-align:\s*(-?[\d.]+)ex/),
  };
}

module.exports = { texToSvg };
