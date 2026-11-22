// Client root: browser scripts and styles of the overlay, in load order. The server concatenates
// them into /term/overlay.js and /term/overlay.css; each script runs in its own function scope and
// shares state through the RT namespace object.
const path = require("path");

const scripts = [
  "core/dom.js",
  "core/store.js",
  "core/theme.js",
  "net/control.js",
  "net/pty.js",
  "wm/layout.js",
  "wm/frame.js",
  "wm/drag.js",
  "wm/resize.js",
  "wm/io.js",
  "wm/window.js",
  "wm/manager.js",
  "dock/menu.js",
  "dock/dock.js",
  "core/keys.js",
  "main.js",
].map((f) => path.join(__dirname, f));

const styles = ["styles/window.css", "styles/dock.css"].map((f) => path.join(__dirname, f));

module.exports = { root: __filename, scripts, styles };
