// One floating terminal window bound to a tmux session: xterm instance, pty connection, geometry
// (a normal rect plus maximised/snapped modes) and minimise state.
RT.TermWindow = class {
  constructor(session, state) {
    this.tmux = session.tmux;
    this.label = state.title || RT.titleOf(session);
    this.f = RT.frame(this.label);
    this.root = this.f.root;
    this.root.dataset.tmux = this.tmux;
    this.mode = "normal"; // normal | max | left | right
    this.prev = null; // normal rect remembered while maximised or snapped
    this.min = false;
    this.dead = false;
    this.wheel = 0;
    this.place(RT.layout.fit(state.rect || RT.layout.cascade(RT.wm.count())));
    if (state.mode === "max") this.maximise();
    else if (state.mode === "left" || state.mode === "right") this.snap(state.mode);

    this.f.close.onclick = () => RT.wm.close(this);
    this.f.min.onclick = () => this.minimise();
    this.f.max.onclick = () => this.toggleMax();
    this.f.noteBtn.onclick = () => this.reattach();
    this.root.addEventListener("pointerdown", () => this.focus(), true);
    RT.attachDrag(this);
    RT.attachResize(this);

    this.term = new RT.xterm.Terminal({
      fontFamily: RT.theme.font(),
      fontSize: RT.theme.fontSize(),
      lineHeight: 1.1,
      scrollback: 5000,
      cursorBlink: true,
      allowProposedApi: true,
      theme: RT.theme.colors,
    });
    this.fitter = new RT.fit.FitAddon();
    this.term.loadAddon(this.fitter);
    this.term.onData((d) => this.pty && this.pty.input(d));
    this.term.attachCustomWheelEventHandler((ev) => this.onWheel(ev));
  }

  mount(layer) {
    layer.append(this.root);
    this.term.open(this.f.host);
    this.fit();
    this.ro = new ResizeObserver(RT.debounce(() => this.fit(), 40));
    this.ro.observe(this.f.host);
    this.connect();
  }

  connect() {
    this.pty = new RT.PtyConn(this.tmux, { cols: this.term.cols, rows: this.term.rows }, {
      size: () => ({ cols: this.term.cols, rows: this.term.rows }),
      onOpen: (again) => {
        if (again) this.term.reset(); // tmux redraws the whole screen on attach
        this.setStatus("");
        this.notice(null);
      },
      onData: (d) => this.term.write(d),
      onStatus: (s) => this.setStatus(s),
      onEnded: () => this.notice("Detached from " + this.tmux + ".", "Reattach"),
      onGone: () => {
        this.dead = true;
        this.notice("Session " + this.tmux + " is no longer running.", null);
        RT.wm.persist();
      },
    });
  }

  reattach() {
    if (this.pty) this.pty.close();
    this.term.reset();
    this.notice(null);
    this.connect();
    this.focus();
  }

  // tmux keeps the terminal on its alternate screen, so the wheel scrolls tmux history (copy-mode)
  // instead of xterm's own scrollback, which would otherwise turn into arrow keys for Claude.
  onWheel(ev) {
    if (this.term.buffer.active.type !== "alternate" || this.term.modes.mouseTrackingMode !== "none") return true;
    ev.preventDefault();
    this.wheel += ev.deltaMode === 1 ? ev.deltaY : ev.deltaY / 33;
    if (!this.wheelTimer) {
      this.wheelTimer = setTimeout(() => {
        this.wheelTimer = null;
        const n = Math.trunc(this.wheel);
        this.wheel -= n;
        if (n && this.pty) this.pty.scroll(n);
      }, 60);
    }
    return false;
  }

  setTitle(session) {
    const t = RT.titleOf(session);
    if (t !== this.label) this.f.title.textContent = this.label = t;
  }

  setStatus(text) {
    this.f.status.textContent = text;
  }

  notice(text, button) {
    this.f.note.classList.toggle("show", Boolean(text));
    this.f.noteText.textContent = text || "";
    this.f.noteBtn.textContent = button || "";
    this.f.noteBtn.style.display = button ? "" : "none";
  }

  place(r) {
    this.rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
    const st = this.root.style;
    st.left = this.rect.x + "px";
    st.top = this.rect.y + "px";
    st.width = this.rect.w + "px";
    st.height = this.rect.h + "px";
  }

  normalRect() {
    return this.mode === "normal" ? this.rect : this.prev || RT.layout.cascade(0);
  }

  setMode(mode, rect) {
    if (mode === "normal") this.prev = null;
    else if (this.mode === "normal") this.prev = { ...this.rect };
    this.mode = mode;
    this.root.classList.toggle("rt-max", mode === "max");
    this.root.classList.toggle("rt-snapped", mode === "left" || mode === "right");
    this.place(rect);
  }

  maximise() {
    this.setMode("max", RT.layout.full());
  }

  snap(side) {
    this.setMode(side, RT.layout.half(side));
  }

  toggleMax() {
    if (this.mode === "max") this.setMode("normal", this.normalRect());
    else this.maximise();
    RT.wm.persist();
  }

  // Keeps the window inside a resized viewport; maximised and snapped windows follow the new size.
  relayout() {
    if (this.mode === "max") this.place(RT.layout.full());
    else if (this.mode !== "normal") this.place(RT.layout.half(this.mode));
    else this.place(RT.layout.fit(this.rect));
  }

  minimise() {
    if (this.min) return;
    this.min = true;
    this.root.classList.add("rt-min");
    this.term.blur();
    RT.dock.render();
    RT.wm.persist();
  }

  restore() {
    if (!this.min) return;
    this.min = false;
    this.root.classList.remove("rt-min");
    RT.dock.render();
    RT.wm.persist();
    requestAnimationFrame(() => this.fit());
  }

  focus(withKeyboard = true) {
    RT.wm.raise(this);
    if (withKeyboard && !this.min) this.term.focus();
  }

  fit() {
    if (this.min || !this.f.host.clientWidth) return;
    const before = this.term.cols + "x" + this.term.rows;
    try {
      this.fitter.fit();
    } catch {
      return;
    }
    if (this.term.cols + "x" + this.term.rows !== before && this.pty) this.pty.resize(this.term.cols, this.term.rows);
  }

  dispose() {
    if (this.pty) this.pty.close();
    if (this.ro) this.ro.disconnect();
    clearTimeout(this.wheelTimer);
    this.term.dispose();
    this.root.remove();
  }
};
