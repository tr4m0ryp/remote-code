// Directory listing for the drilled-in Projects view: folders first, then files, alphabetical, with
// `.git` and the user's files.exclude globs hidden.
const vscode = require("vscode");

const ALWAYS_HIDDEN = new Set([".git"]);
const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

// Minimal glob -> RegExp: **, *, ?, {a,b}. Enough for the patterns files.exclude ships with.
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else if (c === "{") { const end = glob.indexOf("}", i); if (end < 0) { re += "\\{"; continue; }
      re += "(?:" + glob.slice(i + 1, end).split(",").map((s) => s.replace(/[.+^$()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")).join("|") + ")";
      i = end;
    } else re += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}

// Patterns set to plain `true` (conditional `{ when }` entries are skipped).
function excludeMatchers(folderUri) {
  const cfg = vscode.workspace.getConfiguration("files", folderUri).get("exclude", {}) || {};
  return Object.entries(cfg).filter(([, on]) => on === true).map(([g]) => globToRegExp(g.replace(/^\.\//, "")));
}

// Returns [{ uri, name, dir }] for one directory; `rel` is the directory's path below the project root.
async function listDir(dirUri, rel, matchers) {
  let entries;
  try {
    entries = await vscode.workspace.fs.readDirectory(dirUri);
  } catch {
    return [];
  }
  const out = [];
  for (const [name, type] of entries) {
    if (ALWAYS_HIDDEN.has(name)) continue;
    const relPath = rel ? `${rel}/${name}` : name;
    if (matchers.some((m) => m.test(relPath))) continue;
    out.push({ uri: vscode.Uri.joinPath(dirUri, name), name, rel: relPath, dir: Boolean(type & vscode.FileType.Directory) });
  }
  return out.sort((a, b) => (a.dir === b.dir ? cmp(a.name, b.name) : a.dir ? -1 : 1));
}

module.exports = { listDir, excludeMatchers, globToRegExp };
