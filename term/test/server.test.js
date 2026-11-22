// End-to-end checks against a running service (TERM_URL, default http://127.0.0.1:8796): origin
// guard on websockets and the open API, and unknown sessions refused before any pty is spawned.
const test = require("node:test");
const assert = require("node:assert");
const WebSocket = require("ws");

const base = process.env.TERM_URL || "http://127.0.0.1:8796";
const wsBase = base.replace(/^http/, "ws");
const good = "https://code.husimi.ai";

function upgrade(path, origin) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsBase + path, origin ? { origin } : {});
    ws.on("unexpected-response", (_req, res) => resolve({ status: res.statusCode }));
    ws.on("close", (code) => resolve({ code }));
    ws.on("error", () => {});
    ws.on("open", () => setTimeout(() => ws.close(1000), 300));
  });
}

test("websocket from a foreign or missing origin is refused with 403", async () => {
  assert.equal((await upgrade("/term/ws/control", "https://evil.example")).status, 403);
  assert.equal((await upgrade("/term/ws/control")).status, 403);
  assert.equal((await upgrade("/term/ws/pty?session=rc-manager", "https://evil.example")).status, 403);
});

test("pty for an unknown session closes with 4404", async () => {
  assert.equal((await upgrade("/term/ws/pty?session=" + encodeURIComponent("nope; id"), good)).code, 4404);
  assert.equal((await upgrade("/term/ws/pty", good)).code, 4404);
});

test("open API checks origin, content type and session", async () => {
  const post = (body, headers) => fetch(base + "/term/api/open", { method: "POST", body, headers });
  assert.equal((await post('{"tmux":"x"}', { "content-type": "application/json", origin: "https://evil.example" })).status, 403);
  assert.equal((await post('{"tmux":"x"}', { "content-type": "text/plain" })).status, 415);
  assert.equal((await post('{"tmux":"no-such-session-xyz"}', { "content-type": "application/json" })).status, 404);
});

test("sessions API lists tmux sessions with the expected fields", async () => {
  const { sessions } = await (await fetch(base + "/term/api/sessions")).json();
  assert.ok(Array.isArray(sessions));
  for (const s of sessions) for (const k of ["tmux", "name", "project", "root", "busy"]) assert.ok(k in s, k);
});
