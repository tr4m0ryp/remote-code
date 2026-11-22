// The dock's "+" menu: running Claude sessions grouped by project, busy ones marked, open ones
// labelled; picking one opens (or focuses) its window.
RT.menu = {
  el: null,

  init(layer) {
    this.el = RT.el("div", "rt-menu", { role: "menu" });
    layer.append(this.el);
    window.addEventListener("pointerdown", (e) => {
      if (this.isOpen() && !e.target.closest(".rt-menu, .rt-plus")) this.hide();
    }, true);
  },

  isOpen() {
    return this.el.classList.contains("show");
  },

  toggle() {
    this.isOpen() ? this.hide() : this.show();
  },

  show() {
    this.render();
    this.el.classList.add("show");
    RT.dock.render();
  },

  hide() {
    this.el.classList.remove("show");
    RT.dock.render();
  },

  render() {
    if (!this.el) return;
    this.el.replaceChildren();
    const list = RT.control.sessions;
    if (!list.length) {
      this.el.append(RT.el("div", "rt-menu-empty", { text: "No running Claude sessions" }));
      return;
    }
    let group = null;
    for (const s of list) {
      if (s.project !== group) {
        group = s.project;
        this.el.append(RT.el("div", "rt-menu-group", { text: group, title: s.root }));
      }
      const item = RT.el("div", "rt-menu-item", { role: "menuitem", "data-tmux": s.tmux, title: s.root });
      item.append(
        RT.el("span", "rt-dot" + (s.busy ? " busy" : ""), { title: s.busy ? "working" : "idle" }),
        RT.el("span", "rt-menu-name", { text: s.name }),
        RT.el("span", "rt-sub", { text: RT.wm.wins.has(s.tmux) ? "open" : s.tmux })
      );
      item.onclick = () => {
        this.hide();
        RT.wm.open(s.tmux);
      };
      this.el.append(item);
    }
  },
};
