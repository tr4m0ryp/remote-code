// Changed files of a repository (git status --porcelain) with modification times, and the time of
// its first commit; used to rank projects on the Home page.
const fs = require("fs");
const path = require("path");
const { run } = require("./exec");

const MAX_STATS = 60;
const firstCommits = new Map(); // root -> seconds since epoch, or 0; never changes, so cached

// Returns { branch, changed, files: [{ path, mtime }] } with files newest first, or null outside git.
async function changedFiles(root) {
  const out = await run("git", ["-C", root, "status", "--porcelain=v1", "-b", "-z"]);
  if (!out) return null;
  const parts = out.split("\0");
  const head = (parts.shift() || "").replace(/^## /, "");
  const branch = head.split("...")[0].replace(/^No commits yet on /, "");
  const rels = [];
  for (let i = 0; i < parts.length; i++) {
    const rec = parts[i];
    if (rec.length < 4) continue;
    if (rec[0] === "R" || rec[0] === "C") i++; // rename/copy: the source path follows
    rels.push(rec.slice(3));
  }
  const files = [];
  await Promise.all(
    rels.slice(0, MAX_STATS).map(async (rel) => {
      try {
        const st = await fs.promises.stat(path.join(root, rel));
        if (st.isFile()) files.push({ path: path.join(root, rel), mtime: st.mtimeMs });
      } catch {} // deleted files have no mtime and cannot be opened
    })
  );
  files.sort((a, b) => b.mtime - a.mtime);
  return { branch, changed: rels.length, files };
}

async function firstCommitAt(root) {
  if (firstCommits.has(root)) return firstCommits.get(root);
  const out = await run("git", ["-C", root, "log", "--max-parents=0", "--format=%ct"], { timeout: 8000 });
  const times = out.split("\n").map(Number).filter((n) => n > 0);
  const at = times.length ? Math.min(...times) * 1000 : 0;
  firstCommits.set(root, at);
  return at;
}

// Directory creation time where the filesystem records it (0 otherwise).
async function birthtime(dir) {
  try {
    const st = await fs.promises.stat(dir);
    return st.birthtimeMs > 0 ? st.birthtimeMs : 0;
  } catch {
    return 0;
  }
}

module.exports = { changedFiles, firstCommitAt, birthtime };
