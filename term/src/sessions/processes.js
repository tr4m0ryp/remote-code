// Finds running Claude Code CLI processes, their working directory and remote-control name
// (ported from extension/src/discovery/processes.js).
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

// Returns { procs: [{pid, name, cwd}], parents: Map<pid, ppid> }.
async function claudeProcesses() {
  const out = await run("ps", ["-u", String(process.getuid()), "-o", "pid=,ppid=,args="]);
  const procs = [];
  const parents = new Map();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const [pid, ppid, args] = [Number(m[1]), Number(m[2]), m[3]];
    parents.set(pid, ppid);
    if (path.basename(args.split(/\s+/)[0]) !== "claude") continue;
    if (/\s(-p|--print)(\s|$)/.test(args)) continue; // headless one-shot runs are not sessions
    const cwd = cwdOf(pid);
    if (cwd) procs.push({ pid, name: remoteName(args), cwd });
  }
  return { procs, parents };
}

module.exports = { claudeProcesses, remoteName };
