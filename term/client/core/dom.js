// DOM and geometry helpers shared by every overlay module.
RT.el = function (tag, cls, props) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k in props || {}) {
    if (k === "text") n.textContent = props[k];
    else n.setAttribute(k, props[k]);
  }
  return n;
};

RT.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

RT.debounce = function (fn, ms) {
  let t = null;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

RT.wsUrl = (p) => (location.protocol === "https:" ? "wss://" : "ws://") + location.host + p;

RT.MIN_W = 360;
RT.MIN_H = 200;

// Area windows may occupy: the whole viewport above VS Code's status bar.
RT.area = function () {
  const bar = document.querySelector(".part.statusbar");
  const reserve = bar && bar.offsetHeight ? bar.offsetHeight : 22;
  return { x: 0, y: 0, w: window.innerWidth, h: Math.max(RT.MIN_H, window.innerHeight - reserve) };
};

// "session name, project" (the tmux name stands in when the session has no remote-control name).
RT.titleOf = function (s) {
  const name = s.name || s.tmux;
  return s.project ? name + ", " + s.project : name;
};
