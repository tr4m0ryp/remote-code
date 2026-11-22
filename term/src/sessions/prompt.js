// Compose-mode delivery: a whole prompt is typed into a session the proven way (ported from the
// extension's former sendPrompt): load it into a private tmux buffer, bracketed-paste it into the
// session's active pane, wait 250 ms, then press Enter. Multi-line text, quotes and $VARS arrive
// exactly as written.
const crypto = require("crypto");
const { execFile } = require("child_process");

const MAX_BYTES = 100 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tmuxIn(args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile("tmux", args, { timeout: 4000 }, (err, _out, stderr) => {
      err ? reject(new Error(String(stderr || err.message).trim())) : resolve();
    });
    child.stdin.end(input);
  });
}

// Error text for a prompt that may not be sent, or null.
function checkPrompt(text) {
  if (typeof text !== "string") return "prompt must be a string";
  if (!text.trim()) return "empty prompt";
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) return "prompt larger than 100 kB";
  return null;
}

async function sendPrompt(session, text) {
  const body = text.toWellFormed().replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  const target = "=" + session + ":";
  const buffer = "remote-term-" + crypto.randomBytes(4).toString("hex");
  await tmuxIn(["load-buffer", "-b", buffer, "-"], body);
  await tmuxIn(["paste-buffer", "-p", "-d", "-b", buffer, "-t", target], "");
  await sleep(250);
  await tmuxIn(["send-keys", "-t", target, "Enter"], "");
}

module.exports = { sendPrompt, checkPrompt, MAX_BYTES };
