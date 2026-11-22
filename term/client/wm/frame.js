// Builds the DOM of one window: title bar with traffic lights, terminal body, a notice strip for
// detached sessions, and eight edge/corner resize handles.
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

RT.frame = function (title) {
  const root = RT.el("div", "rt-win");
  const bar = RT.el("div", "rt-bar");
  const lights = RT.el("div", "rt-lights");
  const close = RT.el("button", "rt-light rt-close", { title: "Close (detach)", "aria-label": "Close" });
  const min = RT.el("button", "rt-light rt-minbtn", { title: "Minimise to dock", "aria-label": "Minimise" });
  const max = RT.el("button", "rt-light rt-maxbtn", { title: "Maximise / restore", "aria-label": "Maximise" });
  lights.append(close, min, max);
  const titleEl = RT.el("div", "rt-title", { text: title });
  const status = RT.el("div", "rt-status");
  bar.append(lights, titleEl, status);

  const body = RT.el("div", "rt-body");
  const host = RT.el("div", "rt-term");
  const note = RT.el("div", "rt-note");
  const noteText = RT.el("span");
  const noteBtn = RT.el("button", "rt-note-btn");
  note.append(noteText, noteBtn);
  body.append(host, note);
  root.append(bar, body);
  for (const d of HANDLES) root.append(RT.el("div", "rt-h rt-h-" + d, { "data-dir": d }));
  return { root, bar, close, min, max, title: titleEl, status, host, note, noteText, noteBtn };
};
