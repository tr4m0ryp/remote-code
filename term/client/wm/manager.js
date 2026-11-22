// Window manager: registry keyed by tmux session, z-order and focus, snap preview, drag shield,
// Tile, minimise-all, and persistence of every window's geometry.
RT.wm = {
  wins: new Map(),
  z: 10,
  layer: null,

  init(layer) {
    this.layer = layer;
    this.previewEl = RT.el("div", "rt-preview");
    this.shieldEl = RT.el("div", "rt-shield");
    layer.append(this.previewEl, this.shieldEl);
    window.addEventListener("resize", RT.debounce(() => this.wins.forEach((w) => w.relayout()), 80));
  },

  count() {
    return this.wins.size;
  },

  // Opens the session's window, or focuses (and restores) the one already open.
  open(tmux, state, opts = {}) {
    const have = this.wins.get(tmux);
    if (have) {
      have.restore();
      have.focus();
      return have;
    }
    const session = RT.control.find(tmux) || { tmux, name: tmux, project: "", title: state && state.title };
    const win = new RT.TermWindow(session, state || {});
    this.wins.set(tmux, win);
    win.mount(this.layer);
    if (state && state.min) win.minimise();
    else win.focus(opts.focus !== false);
    RT.dock.render();
    this.persist();
    return win;
  },

  // Only for windows whose tmux session ended; the UI itself never closes a window.
  remove(win) {
    this.wins.delete(win.tmux);
    win.dispose();
    RT.dock.render();
    this.persist();
  },

  raise(win) {
    if (win.root.style.zIndex !== String(this.z)) win.root.style.zIndex = String(++this.z);
    for (const w of this.wins.values()) w.root.classList.toggle("rt-focused", w === win);
  },

  preview(kind) {
    const el = this.previewEl;
    if (!kind) return el.classList.remove("show");
    const r = RT.layout.half(kind);
    Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    el.classList.add("show");
  },

  // A transparent cover during drags so webview iframes cannot swallow pointer events.
  shield(on, cursor) {
    this.shieldEl.classList.toggle("on", on);
    this.shieldEl.style.cursor = on ? cursor || "default" : "";
  },

  tile() {
    const list = [...this.wins.values()].filter((w) => !w.dead);
    if (!list.length) return;
    const rects = RT.layout.grid(list.length);
    list.forEach((w, i) => {
      w.restore();
      w.setMode("normal", rects[i]);
      w.focus(false);
    });
    this.persist();
  },

  // Minimises every window when any is showing, otherwise restores them all.
  toggleAll() {
    const list = [...this.wins.values()];
    const anyShown = list.some((w) => !w.min);
    for (const w of list) anyShown ? w.minimise() : w.restore();
    if (!anyShown && list.length) list[list.length - 1].focus();
  },

  onSessions(list) {
    for (const s of list) {
      const w = this.wins.get(s.tmux);
      if (w) w.setTitle(s);
    }
  },

  persist: RT.debounce(function () {
    const out = {};
    for (const w of RT.wm.wins.values()) {
      if (w.dead) continue;
      out[w.tmux] = { rect: w.normalRect(), mode: w.mode, min: w.min, z: Number(w.root.style.zIndex) || 0, title: w.label };
    }
    RT.store.save(out);
  }, 150),

  restoreAll() {
    const saved = Object.entries(RT.store.load()).sort((a, b) => (a[1].z || 0) - (b[1].z || 0));
    for (const [tmux, st] of saved) this.open(tmux, st, { focus: false });
  },
};
