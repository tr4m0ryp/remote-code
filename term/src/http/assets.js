// Static assets: overlay.js (xterm, the fit addon and client/ scripts concatenated into one IIFE so
// nothing leaks into the workbench's globals), overlay.css, and the raw xterm vendor files.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const client = require("../../client");

const mods = path.join(__dirname, "../../node_modules");
const read = (f) => fs.readFileSync(f, "utf8");
const VENDOR = {
  "/term/vendor/xterm.js": [path.join(mods, "@xterm/xterm/lib/xterm.js"), "application/javascript"],
  "/term/vendor/xterm.css": [path.join(mods, "@xterm/xterm/css/xterm.css"), "text/css"],
  "/term/vendor/addon-fit.js": [path.join(mods, "@xterm/addon-fit/lib/addon-fit.js"), "application/javascript"],
  "/term/vendor/addon-webgl.js": [path.join(mods, "@xterm/addon-webgl/lib/addon-webgl.js"), "application/javascript"],
};

// Runs a UMD bundle against a private module object and returns its exports.
function umd(file) {
  return `(function(){var module={exports:{}},exports=module.exports,define;\n${read(file)}\nreturn module.exports;})()`;
}

function bundleJs() {
  const parts = [
    "/* remote-term overlay: floating tmux session windows over the workbench */",
    "(function(){\"use strict\";",
    "if (window.__remoteTerm) return; window.__remoteTerm = true;",
    `var RT = { xterm: ${umd(VENDOR["/term/vendor/xterm.js"][0])},`,
    `  fit: ${umd(VENDOR["/term/vendor/addon-fit.js"][0])},`,
    `  webgl: ${umd(VENDOR["/term/vendor/addon-webgl.js"][0])} };`,
    ...client.scripts.map((f) => `// ---- ${path.relative(path.dirname(client.root), f)}\n(function(){\n${read(f)}\n})();`),
    "})();",
  ];
  return parts.join("\n");
}

function bundleCss() {
  return [read(VENDOR["/term/vendor/xterm.css"][0]), ...client.styles.map(read)].join("\n");
}

function entry(body, type) {
  const buf = Buffer.from(body);
  const gz = zlib.gzipSync(buf, { level: 9 });
  return { buf, gz, type, etag: '"' + crypto.createHash("sha1").update(buf).digest("base64url") + '"' };
}

// Built once per process: restart the service after editing client/.
function build() {
  const table = {
    "/term/overlay.js": entry(bundleJs(), "application/javascript"),
    "/term/overlay.css": entry(bundleCss(), "text/css"),
  };
  for (const [url, [file, type]] of Object.entries(VENDOR)) table[url] = entry(read(file), type);
  return table;
}

let table = null;

function serve(req, res, pathname) {
  table = table || build();
  const a = table[pathname];
  if (!a) return false;
  const headers = {
    "Content-Type": a.type + "; charset=utf-8",
    "Cache-Control": "no-cache",
    ETag: a.etag,
    Vary: "Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
  };
  if (req.headers["if-none-match"] === a.etag) return res.writeHead(304, headers).end(), true;
  const gzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  const body = gzip ? a.gz : a.buf;
  if (gzip) headers["Content-Encoding"] = "gzip";
  res.writeHead(200, { ...headers, "Content-Length": body.length }).end(req.method === "HEAD" ? undefined : body);
  return true;
}

module.exports = { serve, build };
