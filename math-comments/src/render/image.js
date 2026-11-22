// Sizes and colours a MathJax SVG for the editor and encodes it as a data URI. MathJax sizes in ex;
// one ex is taken as half the editor font size times mathComments.scale. Formulas taller than the
// space they get (one line, or the lines of a $$ block) are scaled down to fit.
const { texToSvg } = require("./mathjax");

const parsed = new Map(); // `${display}|${tex}` -> texToSvg result or { error }
const images = new Map(); // full key -> image
const LIMIT = 4000;

function remember(map, key, value) {
  if (map.size >= LIMIT) map.delete(map.keys().next().value);
  map.set(key, value);
  return value;
}

function parse(tex, display) {
  const key = `${display ? 1 : 0}|${tex}`;
  if (parsed.has(key)) return parsed.get(key);
  try {
    return remember(parsed, key, texToSvg(tex, display));
  } catch (e) {
    return remember(parsed, key, { error: String((e && e.message) || e) });
  }
}

// opts: { color, exPx, maxHeight (px, 0 = none) }. Returns { uri, width, height, valign, scaled }
// with valign the CSS vertical-align in px when unscaled, or { error }.
function renderImage(tex, display, opts) {
  const key = `${display ? 1 : 0}|${opts.color}|${opts.exPx}|${opts.maxHeight}|${tex}`;
  if (images.has(key)) return images.get(key);
  const p = parse(tex, display);
  if (p.error) return { error: p.error };
  let width = p.wEx * opts.exPx, height = p.hEx * opts.exPx, valign = p.vaEx * opts.exPx;
  const scaled = opts.maxHeight > 0 && height > opts.maxHeight;
  if (scaled) {
    width *= opts.maxHeight / height;
    height = opts.maxHeight;
    valign = 0;
  }
  width = Math.max(1, Math.round(width * 10) / 10);
  height = Math.max(1, Math.round(height * 10) / 10);
  const svg = p.svg
    .replace(/width="[\d.]+ex"/, `width="${width}px"`)
    .replace(/height="[\d.]+ex"/, `height="${height}px"`)
    .replace(/ style="[^"]*"/, "")
    .replace(/currentColor/g, opts.color);
  const uri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  return remember(images, key, { uri, width, height, valign: Math.round(valign * 10) / 10, scaled });
}

function clearCache() {
  images.clear();
}

module.exports = { renderImage, parse, clearCache };
