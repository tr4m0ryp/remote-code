// Control channel: every connected overlay gets the session list (pushed on change, polled every
// pollMs while anyone listens) and "open" requests posted by the extension.
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
  ws.on("message", () => {}); // the channel is server-to-client; client frames are ignored
  ws.on("close", () => {
    clients.delete(ws);
    if (!clients.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}

module.exports = { attach, broadcast, current };
