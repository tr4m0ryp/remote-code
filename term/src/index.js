// remote-term entry: HTTP + websocket server that backs the floating terminal overlay in code-server.
const http = require("http");
const config = require("./config");
const web = require("./http");
const ws = require("./ws");

function main() {
  web.buildAssets(); // fail fast on a missing vendor file
  ws.killAll; // pty module is loaded lazily on the first attach
  const server = http.createServer(web.handler);
  ws.install(server);
  server.listen(config.port, config.host, () => {
    console.log(`remote-term listening on http://${config.host}:${config.port} (origins: ${config.origins.join(", ")})`);
  });
  const stop = () => {
    ws.killAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

if (require.main === module) main();

module.exports = { main };
