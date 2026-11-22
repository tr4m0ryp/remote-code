// HTTP root: assets, API and a health probe under /term; everything else is 404.
const assets = require("./assets");
const api = require("./api");

async function handler(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if ((req.method === "GET" || req.method === "HEAD") && assets.serve(req, res, pathname)) return;
    if (await api.handle(req, res, pathname)) return;
    if (pathname === "/term/health") return res.writeHead(200, { "Content-Type": "text/plain" }).end("ok\n");
    res.writeHead(404, { "Content-Type": "text/plain" }).end("not found\n");
  } catch (err) {
    console.error(req.method, pathname, err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" }).end("error\n");
  }
}

module.exports = { handler, buildAssets: assets.build };
