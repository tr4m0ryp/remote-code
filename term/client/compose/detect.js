// Menu detection for compose mode: reads xterm's screen and reports whether Claude is showing a
// choice (numbered options with the ❯ cursor, a (y/n) question, or "Esc to cancel" next to numbered
// options). Only the last SCAN non-blank lines of the screen count (menus sit at the bottom of
// Claude's UI), so older transcript text above cannot trigger it.
const SCAN = 15;

RT.menuVisible = function (term) {
  const buf = term.buffer.active;
  const screen = [];
  for (let y = buf.viewportY; y < buf.viewportY + term.rows; y++) {
    const line = buf.getLine(y);
    screen.push(line ? line.translateToString(true) : "");
  }
  const lines = screen.filter((l) => l.trim()).slice(-SCAN);
  if (lines.some((l) => /^\s*[│|]?\s*❯\s*\d+\.\s/.test(l))) return true;
  if (lines.some((l) => /\((?:y\/n|Y\/n|y\/N)\)/.test(l))) return true;
  const numbered = lines.filter((l) => /^\s*[│|]?\s*(?:❯\s*)?\d+\.\s/.test(l)).length;
  return numbered >= 2 && lines.some((l) => /esc to cancel/i.test(l));
};
