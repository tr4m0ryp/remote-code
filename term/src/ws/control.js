// Control channel: every connected overlay gets the session list (pushed on change, polled every
// pollMs while anyone listens) and "open" requests posted by the extension; overlays report which
// session windows they hold and whether each is minimised.
const WebSocket = require("ws");
const config = require("../config");
const sessions = require("../sessions");

const clients = new Set();
let latest = { at: 0, list: [], json: "[]" };
let timer = null;

async function refresh() {
  try {
    const list = await sessions.snapshot();
    const json = JSON.stringify(list);
    const changed = json !== latest.json;
    latest = { at: Date.now(), list, json };
    if (changed) broadcast({ type: "sessions", sessions: list });
  } catch (err) {
    console.error("session refresh failed:", err.message);
  }
  return latest.list;
}

// Cached list when it is fresh enough, otherwise a new scan.
async function current(maxAgeMs = 2000) {
  return Date.now() - latest.at < maxAgeMs ? latest.list : refresh();
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  let n = 0;
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      n++;
    }
  }
  return n;
}

function attach(ws) {
  clients.add(ws);
  if (!timer) timer = setInterval(refresh, config.pollMs);
  current().then((list) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "sessions", sessions: list })));
  ws.windows = [];
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (m && m.type === "ping") ws.send(JSON.stringify({ type: "pong", id: m.id, t: m.t }));
    else if (m && m.type === "windows" && Array.isArray(m.windows)) {
      ws.windows = m.windows
        .filter((w) => w && typeof w.tmux === "string" && w.tmux.length <= 256)
        .slice(0, 200)
        .map((w) => ({ tmux: w.tmux, min: Boolean(w.min) }));
    }
  });
  ws.on("close", () => {
    clients.delete(ws);
    if (!clients.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}

// [{ tmux, min }] over all overlays: a session counts as minimised only if no page shows it.
function windows() {
  const by = new Map();
  for (const ws of clients) for (const w of ws.windows) by.set(w.tmux, (by.has(w.tmux) ? by.get(w.tmux) : true) && w.min);
  return [...by].map(([tmux, min]) => ({ tmux, min }));
}

module.exports = { attach, broadcast, current, windows };
