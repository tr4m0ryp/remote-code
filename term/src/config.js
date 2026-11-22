// Runtime settings for the terminal service; every value can be overridden through the environment.
const os = require("os");
const path = require("path");

const codeServer = process.env.CODE_SERVER_DIR || path.join(os.homedir(), ".local/lib/code-server");
const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

module.exports = {
  host: process.env.TERM_HOST || "127.0.0.1",
  port: Number(process.env.TERM_PORT || 8796),
  // Browser origins allowed to open websockets or post to the API (cross-site hijacking guard).
  origins: list(process.env.TERM_ORIGINS || "https://code.husimi.ai,http://127.0.0.1:8795"),
  pollMs: Number(process.env.TERM_POLL_MS || 5000),
  // node-pty is reused from code-server's bundle so no native build is needed; a local install wins.
  ptyModules: [path.join(__dirname, "../node_modules/node-pty"), path.join(codeServer, "lib/vscode/node_modules/node-pty")],
};
