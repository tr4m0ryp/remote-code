// Unit checks for the origin allow-list and integer clamps (no server needed).
const test = require("node:test");
const assert = require("node:assert");
const { originAllowed, originAcceptable, clampInt } = require("../src/ws/guard");

const allowed = ["https://code.husimi.ai", "http://127.0.0.1:8795"];

test("websocket origin must be on the allow-list", () => {
  assert.ok(originAllowed("https://code.husimi.ai", allowed));
  assert.ok(originAllowed("http://127.0.0.1:8795", allowed));
  for (const bad of [undefined, "", "null", "https://evil.example", "https://code.husimi.ai.evil.example",
    "http://code.husimi.ai", "https://code.husimi.ai:443/", "http://127.0.0.1:8796"]) {
    assert.equal(originAllowed(bad, allowed), false, String(bad));
  }
});

test("plain API calls without an Origin header pass, foreign origins do not", () => {
  assert.ok(originAcceptable(undefined, allowed));
  assert.ok(originAcceptable("https://code.husimi.ai", allowed));
  assert.equal(originAcceptable("https://evil.example", allowed), false);
});

test("clampInt bounds terminal sizes", () => {
  assert.equal(clampInt("80", 20, 500, 120), 80);
  assert.equal(clampInt("9999", 20, 500, 120), 500);
  assert.equal(clampInt("abc", 20, 500, 120), 120);
  assert.equal(clampInt("-5", 5, 200, 32), 5);
});
