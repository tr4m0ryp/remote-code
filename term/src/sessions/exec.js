// Promise wrapper over execFile (never a shell): resolves stdout, or "" on any failure.
const { execFile } = require("child_process");

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 4000, maxBuffer: 8 << 20, ...opts }, (err, stdout) => {
      resolve(err ? "" : String(stdout));
    });
  });
}

module.exports = { run };
