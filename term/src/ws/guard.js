// Request guards shared by the websocket and HTTP layers: origin allow-list and size clamps.
const config = require("../config");

// A browser always sends Origin on websocket upgrades; a missing or foreign one is refused.
function originAllowed(origin, allowed = config.origins) {
  return typeof origin === "string" && allowed.includes(origin);
}

// For plain HTTP calls from local tools (no Origin header at all) only a present Origin is checked.
function originAcceptable(origin, allowed = config.origins) {
  return origin === undefined || originAllowed(origin, allowed);
}

function clampInt(v, lo, hi, dflt) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

module.exports = { originAllowed, originAcceptable, clampInt };
