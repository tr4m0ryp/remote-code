// The file to land on when a project is opened from Home: the newest uncommitted change, else the
// newest file touched by the last few commits. Null when the project has neither.
const fs = require("fs");
const path = require("path");
const { changedFiles } = require("../../discovery");
const { run } = require("../../discovery/exec");

async function newestExisting(root, rels) {
  let best = null;
  for (const rel of rels) {
    try {
      const st = await fs.promises.stat(path.join(root, rel));
      if (st.isFile() && (!best || st.mtimeMs > best.mtime)) best = { path: path.join(root, rel), mtime: st.mtimeMs };
    } catch {} // deleted in a later commit
  }
  return best && best.path;
}

async function latestEdited(root) {
  const changes = await changedFiles(root);
  if (changes && changes.files.length) return changes.files[0].path;
  const out = await run("git", ["-C", root, "log", "-5", "--name-only", "--format="]);
  const rels = [...new Set(out.split("\n").filter(Boolean))].slice(0, 60);
  return newestExisting(root, rels);
}

module.exports = { latestEdited };
