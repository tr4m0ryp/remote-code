// Sessions root: snapshot of the Claude sessions running inside tmux, plus the live-name check that
// guards every pty attach.
const os = require("os");
const path = require("path");
const { run } = require("./exec");
const { claudeProcesses } = require("./processes");
const tmux = require("./tmux");

const roots = new Map(); // cwd -> git toplevel (or cwd); a directory's repository rarely changes

async function repoRoot(dir) {
  if (!roots.has(dir)) roots.set(dir, (await run("git", ["-C", dir, "rev-parse", "--show-toplevel"])).trim() || dir);
  return roots.get(dir);
}

// Basename, widened with the parent directory when two projects share a basename.
function label(root, all) {
  if (root === os.homedir()) return "~";
  const base = path.basename(root) || root;
  const twins = new Set(all.filter((r) => path.basename(r) === base));
  return twins.size > 1 ? path.join(path.basename(path.dirname(root)), base) : base;
}

// [{ tmux, name, project, root, busy }], one entry per tmux session, sorted by project then name.
async function snapshot() {
  const [{ procs, parents }, panes] = await Promise.all([claudeProcesses(), tmux.paneSessions()]);
  const byTmux = new Map();
  for (const p of procs) {
    const where = tmux.sessionFor(p.pid, parents, panes);
    if (where && !byTmux.has(where.session)) byTmux.set(where.session, { p, pane: where.pane });
  }
  const list = await Promise.all(
    [...byTmux].map(async ([session, { p, pane }]) => ({
      tmux: session,
      name: p.name || session,
      root: await repoRoot(p.cwd),
      busy: await tmux.paneBusy(pane),
    }))
  );
  const allRoots = [...new Set(list.map((s) => s.root))];
  for (const s of list) s.project = label(s.root, allRoots);
  return list.sort((a, b) => a.project.localeCompare(b.project) || a.name.localeCompare(b.name));
}

// True only for a name present in the live `tmux list-sessions` set at the moment of the call.
async function isLive(name) {
  if (typeof name !== "string" || !name || name.length > 256) return false;
  return (await tmux.listSessions()).has(name);
}

module.exports = { snapshot, isLive, scroll: tmux.scroll, listSessions: tmux.listSessions };
