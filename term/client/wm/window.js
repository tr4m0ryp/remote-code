// One floating terminal window bound to a tmux session: xterm instance, pty connection, geometry
// (a normal rect plus left/right snapped modes) and minimise state.
RT.TermWindow = class {
  constructor(session, state) {
    this.tmux = session.tmux;
    this.label = session.title || RT.titleOf(session);
    this.f = RT.frame(this.label);
    this.root = this.f.root;
    this.root.dataset.tmux = this.tmux;
    this.mode = "normal"; // normal | left | right
    this.prev = null; // normal rect remembered while snapped
    this.min = false;
    this.dead = false;
    this.wheel = 0;
    this.place(RT.layout.fit(state.rect || RT.layout.cascade(RT.wm.count())));
    if (state.mode === "left" || state.mode === "right") this.snap(state.mode);

    this.f.min.onclick = () => this.minimise();
    this.f.noteBtn.onclick = () => RT.reattach(this);
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
    this.term.attachCustomWheelEventHandler((ev) => RT.wheel(this, ev));
  }

  mount(layer) {
    layer.append(this.root);
    this.term.open(this.f.host);
    this.fit();
    this.ro = new ResizeObserver(RT.debounce(() => this.fit(), 40));
    this.ro.observe(this.f.host);
    RT.connect(this);
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
    this.root.classList.toggle("rt-snapped", mode === "left" || mode === "right");
    this.place(rect);
  }

  snap(side) {
    this.setMode(side, RT.layout.half(side));
  }

  // Keeps the window inside a resized viewport; snapped windows follow the new size.
  relayout() {
    if (this.mode !== "normal") this.place(RT.layout.half(this.mode));
    else this.place(RT.layout.fit(this.rect));
  }

  minimise() {
    if (this.min) return;
    this.min = true;
    this.root.classList.add("rt-min");
    this.term.blur();
    RT.wm.report();
    RT.wm.persist();
  }

  restore() {
    if (!this.min) return;
    this.min = false;
    this.root.classList.remove("rt-min");
    RT.wm.report();
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
