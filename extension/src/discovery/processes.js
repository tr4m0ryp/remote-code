// Finds running Claude Code CLI processes and the directory each one works in.
const fs = require("fs");
const path = require("path");
const { run } = require("./exec");

// "claude ... --remote-control <name> --resume x" -> "<name>" (names may contain spaces).
function remoteName(args) {
  const m = args.match(/--remote-control(?:=|\s+)(.*?)(?=\s+--|$)/);
  return m ? m[1].trim() : null;
}

function cwdOf(pid) {
  try {
    return fs.readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return null;
  }
}

// Returns { procs: [{pid, ppid, uptime, name, remote, cwd}], parents: Map<pid, ppid> }.
async function claudeProcesses(includeLocal) {
  const out = await run("ps", ["-u", String(process.getuid()), "-o", "pid=,ppid=,etimes=,args="]);
  const procs = [];
  const parents = new Map();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const [pid, ppid, uptime, args] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4]];
    parents.set(pid, ppid);
    const argv0 = args.split(/\s+/)[0];
    if (path.basename(argv0) !== "claude") continue;
    const name = remoteName(args);
    if (!name && !includeLocal) continue;
    if (/\s(-p|--print)(\s|$)/.test(args)) continue; // headless one-shot runs are not sessions
    const cwd = cwdOf(pid);
    if (cwd) procs.push({ pid, ppid, uptime, name, remote: Boolean(name), cwd });
  }
  return { procs, parents };
}

module.exports = { claudeProcesses };
