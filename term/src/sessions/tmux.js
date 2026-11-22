// tmux queries: the live session set, pane-to-session mapping, busy detection and copy-mode scroll.
// Targets are "=name" (exact session match) after the caller validated the name against listSessions;
// pane commands need "=name:" (that session's active pane), since "=" alone only applies to sessions.
const { run } = require("./exec");

async function listSessions() {
  const out = await run("tmux", ["list-sessions", "-F", "#{session_name}"]);
  return new Set(out.split("\n").filter(Boolean));
}

// Map<pane shell pid, { session, pane }>.
async function paneSessions() {
  const out = await run("tmux", ["list-panes", "-a", "-F", "#{pane_pid}\t#{session_name}\t#{pane_id}"]);
  const byPid = new Map();
  for (const line of out.split("\n")) {
    const [pid, session, pane] = line.split("\t");
    if (pid && session && pane) byPid.set(Number(pid), { session, pane });
  }
  return byPid;
}

// Walks up the parent chain until it reaches a tmux pane's shell.
function sessionFor(pid, parents, panes) {
  for (let cur = pid, hops = 0; cur > 1 && hops < 32; cur = parents.get(cur), hops++) {
    if (panes.has(cur)) return panes.get(cur);
  }
  return null;
}

// Claude shows "esc to interrupt" while it works and "Waiting for N background agents to finish"
// while its subagents run (same rule as extension/src/discovery/pane.js).
const BUSY = /esc to interrupt|waiting for \d+ background (?:agents?|tasks?)/i;

async function paneBusy(pane) {
  const out = await run("tmux", ["capture-pane", "-p", "-J", "-t", pane, "-S", "-14"]);
  return BUSY.test(out.replace(/\s+$/, "").split("\n").slice(-12).join("\n"));
}

// Scrolls the session's active pane through tmux copy-mode; lines < 0 scrolls up into history.
// copy-mode -e leaves the mode again once scrolled back to the bottom.
async function scroll(session, lines) {
  const target = "=" + session + ":";
  const n = String(Math.min(Math.abs(lines), 200));
  if (lines < 0) {
    await run("tmux", ["copy-mode", "-e", "-t", target]);
    await run("tmux", ["send-keys", "-t", target, "-X", "-N", n, "scroll-up"]);
  } else if ((await run("tmux", ["display-message", "-p", "-t", target, "#{pane_in_mode}"])).trim() === "1") {
    await run("tmux", ["send-keys", "-t", target, "-X", "-N", n, "scroll-down"]);
  }
}

module.exports = { listSessions, paneSessions, sessionFor, paneBusy, scroll };
