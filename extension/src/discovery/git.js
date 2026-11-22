// Git facts per project: repository root, branch, and count of changed files.
const { run } = require("./exec");

async function repoRoot(dir) {
  const out = await run("git", ["-C", dir, "rev-parse", "--show-toplevel"]);
  return out.trim() || dir;
}

async function repoStatus(dir) {
  const out = await run("git", ["-C", dir, "status", "--porcelain=v1", "-b"]);
  if (!out) return null;
  const lines = out.split("\n").filter(Boolean);
  const head = (lines[0] || "").replace(/^## /, "");
  const branch = head.split("...")[0].replace(/^No commits yet on /, "");
  return { branch, changed: lines.length - 1 };
}

module.exports = { repoRoot, repoStatus };
