// Discovery root: one snapshot of running Claude sessions grouped by project directory.
const os = require("os");
const path = require("path");
const { claudeProcesses } = require("./processes");
const { paneSessions, sessionFor } = require("./tmux");
const { repoRoot, repoStatus } = require("./git");

// Returns [{ root, label, git, sessions: [{pid, name, tmux, remote, uptime}] }], sorted by label.
async function snapshot({ includeLocal }) {
  const [{ procs, parents }, panes] = await Promise.all([claudeProcesses(includeLocal), paneSessions()]);
  const projects = new Map();
  await Promise.all(
    procs.map(async (p) => {
      const root = await repoRoot(p.cwd);
      if (!projects.has(root)) projects.set(root, { root, sessions: [] });
      const where = sessionFor(p.pid, parents, panes);
      const tmux = where ? where.session : null;
      projects.get(root).sessions.push({
        pid: p.pid,
        name: p.name || tmux || `pid ${p.pid}`,
        tmux,
        pane: where ? where.pane : null,
        remote: p.remote,
        uptime: p.uptime,
      });
    })
  );
  const list = [...projects.values()];
  await Promise.all(list.map(async (p) => (p.git = await repoStatus(p.root))));
  labelProjects(list);
  for (const p of list) p.sessions.sort((a, b) => a.name.localeCompare(b.name));
  return list.sort((a, b) => a.label.localeCompare(b.label));
}

// Basename, widened with the parent directory when two projects share a basename.
function labelProjects(list) {
  const home = os.homedir();
  const counts = new Map();
  for (const p of list) counts.set(path.basename(p.root), (counts.get(path.basename(p.root)) || 0) + 1);
  for (const p of list) {
    const base = path.basename(p.root) || p.root;
    p.label = p.root === home ? "~" : counts.get(base) > 1 ? path.join(path.basename(path.dirname(p.root)), base) : base;
  }
}

module.exports = { snapshot };
