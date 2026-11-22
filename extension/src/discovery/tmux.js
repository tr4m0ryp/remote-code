// Maps tmux pane shell pids to their pane, so a process can be traced to the pane it runs in.
const { run } = require("./exec");

// Map<pane shell pid, { session, pane }>, where pane is the stable tmux pane id like "%12".
async function paneSessions() {
  const out = await run("tmux", ["list-panes", "-a", "-F", "#{pane_pid}\t#{session_name}\t#{pane_id}"]);
  const byPid = new Map();
  for (const line of out.split("\n")) {
    const [pid, session, pane] = line.split("\t");
    if (pid && session && pane) byPid.set(Number(pid), { session, pane });
  }
  return byPid;
}

// Walks up the parent chain until it reaches a tmux pane's shell.
function sessionFor(pid, parents, panes) {
  for (let cur = pid, hops = 0; cur > 1 && hops < 32; cur = parents.get(cur), hops++) {
    if (panes.has(cur)) return panes.get(cur);
  }
  return null;
}

module.exports = { paneSessions, sessionFor };
