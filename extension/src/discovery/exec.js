// Thin promise wrappers over execFile: return stdout, or "" on any failure.
const { execFile } = require("child_process");

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 4000, maxBuffer: 8 << 20, ...opts }, (err, stdout) => {
      resolve(err ? "" : String(stdout));
    });
  });
}

// Like run, but feeds `input` on stdin and rejects on failure (callers need to know).
function runInput(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { timeout: 4000 }, (err, stdout, stderr) => {
      err ? reject(new Error(String(stderr || err.message).trim())) : resolve(String(stdout));
    });
    child.stdin.end(input);
  });
}

module.exports = { run, runInput };
