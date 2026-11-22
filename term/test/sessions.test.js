// Session validation against the live `tmux list-sessions` set, plus the remote-control name parser.
const test = require("node:test");
const assert = require("node:assert");
const sessions = require("../src/sessions");
const { remoteName } = require("../src/sessions/processes");

test("isLive accepts exactly the names tmux reports", async () => {
  const live = [...(await sessions.listSessions())];
  if (live.length) assert.ok(await sessions.isLive(live[0]));
});

test("isLive rejects unknown, partial, injected and non-string names", async () => {
  const live = await sessions.listSessions();
  const bad = ["no-such-session-xyz", "rc-", "rc", "=rc-manager", "rc-manager; rm -rf ~", "$(id)",
    "rc-manager\n", " rc-manager", "", null, undefined, 42, {}, "x".repeat(300)];
  for (const name of bad) {
    if (typeof name === "string" && live.has(name)) continue;
    assert.equal(await sessions.isLive(name), false, JSON.stringify(name));
  }
});

test("remoteName parses names with spaces and stops at the next flag", () => {
  assert.equal(remoteName("claude --remote-control loan crypto | idea --resume abc"), "loan crypto | idea");
  assert.equal(remoteName("claude --remote-control=x"), "x");
  assert.equal(remoteName("claude --resume abc"), null);
});
