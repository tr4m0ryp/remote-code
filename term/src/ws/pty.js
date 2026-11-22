// Terminal channel: one `tmux attach-session` client in a pty per websocket. Closing the socket kills
// that client, which only detaches it; the tmux session itself is never touched.
// Output goes out as binary frames, coalesced per event-loop tick (setImmediate, never a timer).
// Client frames: binary = raw keystrokes (sent unbatched); text = JSON {t:"i", d} input,
// {t:"r", c, r} resize, {t:"s", n} copy-mode scroll, {t:"prompt", text} compose-mode prompt.
const os = require("os");
const WebSocket = require("ws");
const config = require("../config");
const sessions = require("../sessions");
const { clampInt } = require("./guard");

const HIGH_WATER = 1 << 20; // pause the pty while this much output is queued on the socket
let ptyLib = null;

function loadPty() {
  if (ptyLib) return ptyLib;
  for (const p of config.ptyModules) {
    try {
      return (ptyLib = require(p));
    } catch {}
  }
  throw new Error("node-pty not found in " + config.ptyModules.join(", "));
}

const live = new Set(); // running pty clients, killed on shutdown

async function attach(ws, url) {
  const name = url.searchParams.get("session");
  if (!(await sessions.isLive(name))) return ws.close(4404, "unknown session");
  const cols = clampInt(url.searchParams.get("cols"), 20, 500, 120);
  const rows = clampInt(url.searchParams.get("rows"), 5, 200, 32);
  const env = { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" };
  delete env.TMUX;
  const term = loadPty().spawn("tmux", ["attach-session", "-t", "=" + name], {
    name: "xterm-256color", cols, rows, cwd: os.homedir(), env,
  });
  live.add(term);
  const sendJson = (o) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  let paused = false;
  const drain = () => {
    if (ws.bufferedAmount < HIGH_WATER / 4) { paused = false; term.resume(); } else setTimeout(drain, 40);
  };
  let pending = [];
  const flush = () => {
    const out = pending.join("");
    pending = [];
    if (ws.readyState !== WebSocket.OPEN || !out) return;
    ws.send(Buffer.from(out, "utf8"), { binary: true });
    if (!paused && ws.bufferedAmount > HIGH_WATER) { paused = true; term.pause(); setTimeout(drain, 40); }
  };
  term.onData((d) => {
    if (!pending.length) setImmediate(flush);
    pending.push(d);
  });
  // 4404 when the session itself ended (the window then goes away), 4000 when only this client left.
  term.onExit(async () => {
    live.delete(term);
    const gone = !(await sessions.isLive(name));
    if (ws.readyState === WebSocket.OPEN) ws.close(gone ? 4404 : 4000, gone ? "session ended" : "detached");
  });
  ws.on("message", async (raw, isBinary) => {
    if (isBinary) return term.write(raw.toString("utf8"));
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (m.t === "i" && typeof m.d === "string") term.write(m.d);
    else if (m.t === "prompt") {
      const bad = sessions.checkPrompt(m.text) || ((await sessions.isLive(name)) ? null : "session ended");
      if (!bad) await sessions.sendPrompt(name, m.text).catch((err) => sendJson({ t: "prompt", error: err.message }));
      sendJson({ t: "prompt", ok: !bad, error: bad || undefined, id: m.id });
    }
    else if (m.t === "r") term.resize(clampInt(m.c, 20, 500, cols), clampInt(m.r, 5, 200, rows));
    else if (m.t === "s" && Number.isFinite(m.n) && m.n !== 0) sessions.scroll(name, m.n);
  });
  ws.on("close", () => {
    if (live.delete(term)) term.kill();
  });
}

function killAll() {
  for (const t of live) t.kill();
  live.clear();
}

module.exports = { attach, killAll, loadPty };
