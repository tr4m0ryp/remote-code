// Read-only look at a Claude session's tmux pane: its last lines and whether Claude is working.
const { run } = require("./exec");

// Claude shows "esc to interrupt" while working, and "Waiting for N background agents to finish"
// while its subagents run.
const BUSY = /esc to interrupt|waiting for \d+ background (?:agents?|tasks?)/i;

async function paneStatus(pane) {
  const out = await run("tmux", ["capture-pane", "-p", "-J", "-t", pane, "-S", "-40"]);
  const lines = out.replace(/\s+$/, "").split("\n");
  return { busy: BUSY.test(lines.slice(-12).join("\n")), tail: lines.slice(-14).join("\n") };
}

module.exports = { paneStatus };
