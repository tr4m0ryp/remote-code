// Home page model: every workspace folder with its git, session and activity facts, ranked into
// "being worked on now" (a busy session pane or a change in the last 15 min) and "recently added"
// (joined the workspace, folder created or first commit in the last 72 h).
const path = require("path");
const { changedFiles, firstCommitAt, birthtime, paneStatus } = require("../../discovery");

const WORKING_MS = 15 * 60 * 1000;
const RECENT_MS = 72 * 3600 * 1000;
const MAX_FILES = 5;

async function sessionStates(project) {
  if (!project) return [];
  return Promise.all(
    project.sessions.map(async (s) => {
      if (!s.pane) return { name: s.name, state: "no tmux" };
      const st = await paneStatus(s.pane).catch(() => null);
      return { name: s.name, state: st && st.busy ? "working" : "idle" };
    })
  );
}

// Newest of the creation signals that falls inside the 72 h window, or null.
async function addedSignal(root, syncAt, now) {
  const [born, first] = await Promise.all([birthtime(root), firstCommitAt(root)]);
  const hits = [
    { at: syncAt || 0, how: "added to workspace" },
    { at: born, how: "folder created" },
    { at: first, how: "first commit" },
  ].filter((h) => h.at && now - h.at < RECENT_MS);
  return hits.sort((a, b) => b.at - a.at)[0] || null;
}

async function describe(folder, snapshot, addedAt, now) {
  const root = folder.uri.fsPath;
  const snap = snapshot.find((p) => p.root === root) || null;
  const [changes, sessions, added] = await Promise.all([changedFiles(root), sessionStates(snap), addedSignal(root, addedAt[root], now)]);
  const files = changes ? changes.files : [];
  const lastChange = files.length ? files[0].mtime : 0;
  const busy = sessions.some((s) => s.state === "working");
  return {
    root,
    name: folder.name,
    branch: changes ? changes.branch : null,
    changed: changes ? changes.changed : 0,
    sessions,
    lastChange,
    files: files.slice(0, MAX_FILES).map((f) => ({ path: f.path, rel: path.relative(root, f.path), mtime: f.mtime })),
    added,
    busy,
    working: busy || (lastChange > 0 && now - lastChange < WORKING_MS),
  };
}

async function buildModel({ folders, snapshot, addedAt }) {
  const now = Date.now();
  const projects = await Promise.all(folders.map((f) => describe(f, snapshot, addedAt, now)));
  const working = projects.filter((p) => p.working).sort((a, b) => b.busy - a.busy || b.lastChange - a.lastChange);
  const recent = projects.filter((p) => !p.working && p.added).sort((a, b) => b.added.at - a.added.at);
  const all = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  return { now, working, recent, all };
}

module.exports = { buildModel };
