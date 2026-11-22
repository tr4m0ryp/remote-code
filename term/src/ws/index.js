// Websocket root: routes upgrades on /term/ws/{control,pty} after the origin check, and pings every
// socket so dead browser tabs are reaped.
const { WebSocketServer } = require("ws");
const control = require("./control");
const pty = require("./pty");
const guard = require("./guard");

const ROUTES = { "/term/ws/control": control.attach, "/term/ws/pty": pty.attach };

function install(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 20 });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    const route = ROUTES[url.pathname];
    if (!route || !guard.originAllowed(req.headers.origin)) {
      socket.end(`HTTP/1.1 ${route ? "403 Forbidden" : "404 Not Found"}\r\nConnection: close\r\n\r\n`);
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.alive = true;
      ws.on("pong", () => (ws.alive = true));
      route(ws, url);
    });
  });
  const beat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) ws.terminate();
      else { ws.alive = false; ws.ping(); }
    }
  }, 30000);
  wss.on("close", () => clearInterval(beat));
  return wss;
}

module.exports = { install, broadcast: control.broadcast, current: control.current, killAll: pty.killAll, loadPty: pty.loadPty, guard };
