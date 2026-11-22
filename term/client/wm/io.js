// A window's link to its tmux session: pty connection and reattach, renderer choice, and wheel
// scrolling that drives tmux history instead of xterm's scrollback (tmux keeps xterm on its
// alternate screen, where a plain wheel would otherwise turn into arrow keys for Claude).
const GONE_MS = 8000; // how long a window of an ended session shows its notice before it goes

RT.connect = function (win) {
  const term = win.term;
  win.pty = new RT.PtyConn(win.tmux, { cols: term.cols, rows: term.rows }, {
    size: () => ({ cols: term.cols, rows: term.rows }),
    onOpen: (again) => {
      if (again) term.reset(); // tmux redraws the whole screen on attach
      win.setStatus("");
      win.notice(null);
    },
    onData: (d) => term.write(d),
    onPrompt: (m) => win.compose.onPrompt(m),
    onStatus: (s) => win.setStatus(s),
    onEnded: () => win.notice("Detached from " + win.tmux + ".", "Reattach"),
    onGone: () => {
      win.dead = true;
      win.notice("Session " + win.tmux + " is no longer running.", null);
      RT.wm.persist();
      setTimeout(() => RT.wm.wins.get(win.tmux) === win && RT.wm.remove(win), GONE_MS);
    },
  });
};

RT.reattach = function (win) {
  if (win.pty) win.pty.close();
  win.term.reset();
  win.notice(null);
  RT.connect(win);
  win.focus();
};

// Returns false (event consumed) while tmux owns the screen; scroll steps are batched per 60 ms.
RT.wheel = function (win, ev) {
  if (win.term.buffer.active.type !== "alternate" || win.term.modes.mouseTrackingMode !== "none") return true;
  ev.preventDefault();
  win.wheel += ev.deltaMode === 1 ? ev.deltaY : ev.deltaY / 33;
  if (!win.wheelTimer) {
    win.wheelTimer = setTimeout(() => {
      win.wheelTimer = null;
      const n = Math.trunc(win.wheel);
      win.wheel -= n;
      if (n && win.pty) win.pty.scroll(n);
    }, 60);
  }
  return false;
};

// WebGL renderer when the browser offers it (falls back to xterm's DOM renderer; xterm 6 has no
// canvas renderer). A lost GPU context drops back to DOM as well; localStorage
// remoteTerm.renderer = "dom" forces DOM.
RT.useWebgl = function (term) {
  if (localStorage.getItem("remoteTerm.renderer") === "dom") return "dom"; // manual escape hatch
  try {
    const gl = new RT.webgl.WebglAddon();
    gl.onContextLoss(() => gl.dispose());
    term.loadAddon(gl);
    return "webgl";
  } catch {
    return "dom";
  }
};
