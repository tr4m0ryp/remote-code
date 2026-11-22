// Talks to a running Claude Code CLI through its tmux pane: the prompt is typed into the user's own
// harness exactly as if entered at the keyboard, so hooks, skills and settings all apply.
const { run, runInput } = require("../discovery/exec");

const BUFFER = "remote-sessions-prompt";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bracketed paste keeps multi-line prompts as one message; Enter then submits it.
async function sendPrompt(pane, text) {
  const body = String(text).replace(/\r\n?/g, "\n").trim();
  if (!body) throw new Error("empty prompt");
  await runInput("tmux", ["load-buffer", "-b", BUFFER, "-"], body);
  await runInput("tmux", ["paste-buffer", "-p", "-d", "-b", BUFFER, "-t", pane], "");
  await sleep(250);
  await runInput("tmux", ["send-keys", "-t", pane, "Enter"], "");
}

// Last visible lines of the pane plus a busy flag (Claude shows "esc to interrupt" while working).
async function paneStatus(pane) {
  const out = await run("tmux", ["capture-pane", "-p", "-J", "-t", pane, "-S", "-40"]);
  const lines = out.replace(/\s+$/, "").split("\n");
  return { busy: /esc to interrupt/i.test(lines.slice(-12).join("\n")), tail: lines.slice(-14).join("\n") };
}

module.exports = { sendPrompt, paneStatus };
