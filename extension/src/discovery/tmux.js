// Maps tmux pane shell pids to their session names, so a process can be traced to its session.
const { run } = require("./exec");

async function paneSessions() {
  const out = await run("tmux", ["list-panes", "-a", "-F", "#{pane_pid}\t#{session_name}"]);
  const byPid = new Map();
  for (const line of out.split("\n")) {
    const [pid, session] = line.split("\t");
    if (pid && session) byPid.set(Number(pid), session);
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
