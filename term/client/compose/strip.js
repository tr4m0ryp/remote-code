// Compose mode for one window: a local input strip ("❯", auto-growing to 8 lines) where typing costs
// no network at all; Enter sends the whole text as one prompt (server pastes it into the pane),
// Shift+Enter adds a line, Up/Down on the first/last line walk the history. Direct mode hands every
// key to the terminal instead: automatically while Claude shows a menu, for one line after a
// leading "/" or "@" (native autocomplete), or by hand with Ctrl+Alt+D. The title-bar badge shows
// the mode.
const MAX_LINES = 8;

RT.Compose = class {
  constructor(win) {
    this.win = win;
    this.manual = null; // "direct" | "compose" chosen with Ctrl+Alt+D, overriding detection
    this.menu = false;
    this.line = false;
    this.history = [];
    this.hIndex = -1;
    this.strip = RT.el("div", "rt-strip");
    this.input = RT.el("textarea", "rt-input", { rows: "1", spellcheck: "false", autocomplete: "off", "aria-label": "Prompt" });
    this.hint = RT.el("span", "rt-hint");
    this.strip.append(RT.el("span", "rt-caret", { text: "❯" }), this.input, this.hint);
    this.badge = RT.el("span", "rt-badge");
    this.badge.onclick = () => this.toggle();
    win.f.bar.insertBefore(this.badge, win.f.status);
    win.root.append(this.strip);

    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.input.addEventListener("input", () => this.grow());
    this.strip.addEventListener("pointerdown", () => this.mode === "direct" && setTimeout(() => this.focus(), 0));
    // A click in the terminal focuses the strip; a drag there still selects (and copies) text.
    win.f.host.addEventListener("mouseup", () => setTimeout(() => !win.term.hasSelection() && this.focus(), 0));
    win.term.onWriteParsed(RT.debounce(() => this.detect(), 60));
    win.term.attachCustomKeyEventHandler((e) => this.onTermKey(e));
    this.apply();
  }

  get auto() {
    return this.menu || this.line ? "direct" : "compose";
  }

  get mode() {
    return this.manual || this.auto;
  }

  apply() {
    const m = this.mode;
    const had = this.win.root.contains(document.activeElement);
    this.strip.classList.toggle("direct", m === "direct");
    this.input.readOnly = m === "direct";
    this.badge.textContent = m + (this.manual ? " (manual)" : "");
    this.badge.title = "Ctrl+Alt+D toggles direct and compose";
    this.hint.textContent = m === "direct" ? (this.line ? "direct: autocomplete" : this.menu ? "direct: menu" : "direct") : "";
    if (had) this.focus();
  }

  focus() {
    if (this.win.min) return;
    if (this.mode === "direct") this.win.term.focus();
    else this.input.focus({ preventScroll: true });
  }

  toggle() {
    const next = this.mode === "direct" ? "compose" : "direct";
    this.manual = next === this.auto ? null : next;
    this.apply();
    this.focus();
  }

  detect() {
    const v = RT.menuVisible(this.win.term);
    if (v !== this.menu) {
      this.menu = v;
      this.apply();
    }
  }

  isToggle(e) {
    return e.ctrlKey && e.altKey && !e.metaKey && e.code === "KeyD";
  }

  // Keys while xterm has focus (direct mode): the toggle, and the end of an autocomplete line.
  onTermKey(e) {
    if (e.type !== "keydown") return true;
    if (this.isToggle(e)) {
      e.preventDefault();
      this.toggle();
      return false;
    }
    if (this.line && (e.key === "Enter" || e.key === "Escape")) {
      setTimeout(() => {
        this.line = false;
        this.apply();
      }, 0);
    }
    return true;
  }

  onKey(e) {
    if (e.isComposing) return;
    if (this.isToggle(e)) return e.preventDefault(), this.toggle();
    const empty = this.input.value === "";
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    if (e.key === "Enter" && plain && !e.shiftKey) {
      e.preventDefault();
      return empty ? this.win.pty.input("\r") : this.submit();
    }
    if (!empty && plain && !e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && this.recall(e.key === "ArrowUp")) {
      return e.preventDefault();
    }
    if (empty && plain && (e.key === "/" || e.key === "@")) {
      e.preventDefault();
      this.win.pty.input(e.key);
      this.line = true;
      this.apply();
      return this.win.term.focus();
    }
    const bytes = RT.ptyKey(e, { empty, term: this.win.term, input: this.input });
    if (bytes === null) return;
    e.preventDefault();
    if (bytes) this.win.pty.input(bytes);
  }

  // History walk, only from the first line (older) or the last line (newer) of the strip.
  recall(older) {
    const v = this.input.value;
    const caret = this.input.selectionStart;
    if (older ? v.lastIndexOf("\n", caret - 1) !== -1 : v.indexOf("\n", caret) !== -1) return false;
    if (!this.history.length) return false;
    if (this.hIndex === -1) this.draft = v;
    const i = older ? Math.min(this.hIndex + 1, this.history.length - 1) : this.hIndex - 1;
    this.hIndex = Math.max(-1, i);
    this.input.value = this.hIndex === -1 ? this.draft : this.history[this.history.length - 1 - this.hIndex];
    this.grow();
    return true;
  }

  submit() {
    const text = this.input.value;
    if (!text.trim()) return;
    this.win.pty.prompt(text, Date.now());
    if (this.history[this.history.length - 1] !== text) this.history.push(text);
    this.hIndex = -1;
    this.input.value = "";
    this.grow();
    this.hint.textContent = "sending";
  }

  onPrompt(m) {
    this.hint.textContent = m.ok ? "" : "not sent: " + (m.error || "error");
  }

  grow() {
    const lines = Math.min(MAX_LINES, this.input.value.split("\n").length);
    this.input.rows = lines;
    this.input.style.overflowY = this.input.value.split("\n").length > MAX_LINES ? "auto" : "hidden";
  }
};
