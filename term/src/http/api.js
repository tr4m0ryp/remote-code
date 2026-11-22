// JSON API: GET /term/api/sessions lists running Claude sessions; POST /term/api/open {tmux}
// asks every connected overlay to open (or focus) that session's window.
const sessions = require("../sessions");
const { broadcast, current, guard } = require("../ws");

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(body));
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("body too large")); req.destroy(); } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function open(req, res) {
  // A JSON content type forces a CORS preflight on cross-site posts, which this server never answers.
  if (!/^application\/json\b/.test(req.headers["content-type"] || "")) return json(res, 415, { error: "json only" });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: "bad json" });
  }
  if (!(await sessions.isLive(body && body.tmux))) return json(res, 404, { error: "unknown session" });
  json(res, 200, { ok: true, overlays: broadcast({ type: "open", tmux: body.tmux }) });
}

async function handle(req, res, pathname) {
  if (pathname !== "/term/api/sessions" && pathname !== "/term/api/open") return false;
  if (!guard.originAcceptable(req.headers.origin)) json(res, 403, { error: "origin" });
  else if (pathname === "/term/api/sessions" && req.method === "GET") json(res, 200, { sessions: await current() });
  else if (pathname === "/term/api/open" && req.method === "POST") await open(req, res);
  else json(res, 405, { error: "method" });
  return true;
}

module.exports = { handle };
