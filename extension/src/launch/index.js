// Starts a new Claude remote-control session in its own tmux session, the same way the existing
// sessions on this host run. Everything goes through execFile argv; the one string tmux hands to
// its shell is built only from validated, single-quoted parts.
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { run, runInput } = require("../discovery/exec");

const NAME = /^[A-Za-z0-9._-]{1,48}$/;
const CLAUDE = path.join(os.homedir(), ".local/bin/claude");

const quote = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

// tmux turns "." and ":" in session names into "_", so the tmux name is derived the same way.
const tmuxName = (name) => "rc-" + name.replace(/[.:]/g, "_");

function defaultName(dir) {
  const base = path.basename(dir).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45) || "session";
  return `${base}-${crypto.randomBytes(1).toString("hex")}`;
}

// Error text for a directory that may not host a session, or null when it is fine.
function checkDir(dir, home = os.homedir()) {
  if (!dir || !path.isAbsolute(dir)) return "Enter an absolute path.";
  let real;
  try {
    real = fs.realpathSync(dir);
    if (!fs.statSync(real).isDirectory()) return "Not a directory.";
  } catch {
    return "No such directory.";
  }
  return real === home || real.startsWith(home + path.sep) ? null : `Must be inside ${home}.`;
}

function checkName(name) {
  return NAME.test(name || "") ? null : "Use 1-48 letters, digits, '.', '_' or '-'.";
}

async function sessionExists(tmux) {
  const out = await run("tmux", ["list-sessions", "-F", "#{session_name}"]);
  return out.split("\n").includes(tmux);
}

function claudeCommand(name, configDir) {
  if (checkName(name)) throw new Error("invalid session name");
  if (!path.isAbsolute(configDir) || /[\0-\x1f]/.test(configDir)) throw new Error("invalid launchConfigDir");
  return `env -u CLAUDE_CONFIG_DIR CLAUDE_CONFIG_DIR=${quote(configDir)} ${quote(CLAUDE)} --dangerously-skip-permissions --remote-control ${quote(name)}`;
}

// Returns the tmux session name; throws with a user-facing message on any refusal.
async function launch({ dir, name, configDir }) {
  const bad = checkDir(dir) || checkName(name);
  if (bad) throw new Error(bad);
  const tmux = tmuxName(name);
  if (await sessionExists(tmux)) throw new Error(`tmux session ${tmux} already exists`);
  await runInput("tmux", ["new-session", "-d", "-s", tmux, "-c", fs.realpathSync(dir), claudeCommand(name, configDir)], "");
  return tmux;
}

module.exports = { launch, checkDir, checkName, defaultName, tmuxName, sessionExists, claudeCommand };
