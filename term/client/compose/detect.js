// Menu detection for compose mode: reads the bottom of xterm's screen and reports whether Claude is
// showing a choice (numbered options with the ❯ cursor, a (y/n) question, or "Esc to cancel" next to
// numbered options). Only the bottom lines count, so earlier transcript text cannot trigger it.
const SCAN = 15;

RT.menuVisible = function (term) {
  const buf = term.buffer.active;
  const lines = [];
  for (let y = Math.max(0, buf.viewportY + term.rows - SCAN); y < buf.viewportY + term.rows; y++) {
    const line = buf.getLine(y);
    if (line) lines.push(line.translateToString(true));
  }
  if (lines.some((l) => /^\s*[│|]?\s*❯\s*\d+\.\s/.test(l))) return true;
  if (lines.some((l) => /\((?:y\/n|Y\/n|y\/N)\)/.test(l))) return true;
  const numbered = lines.filter((l) => /^\s*[│|]?\s*(?:❯\s*)?\d+\.\s/.test(l)).length;
  return numbered >= 2 && lines.some((l) => /esc to cancel/i.test(l));
};
