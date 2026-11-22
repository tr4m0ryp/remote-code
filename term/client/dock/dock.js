// The dock: a slim bar at the bottom centre with minimised windows, a Tile action and the "+"
// session menu. Hidden until the pointer nears the bottom edge, or while any window is minimised.
const HOT = 10; // px from the bottom edge that reveal the dock
const LINGER = 700; // ms the dock stays after the pointer leaves

RT.dock = {
  hover: false,

  init(layer) {
    this.el = RT.el("div", "rt-dock");
    this.items = RT.el("div", "rt-dock-items");
    this.sep = RT.el("div", "rt-dock-sep");
    const tile = RT.el("button", "rt-dock-btn", { text: "Tile", title: "Lay all windows side by side" });
    const plus = RT.el("button", "rt-dock-btn rt-plus", { text: "+", title: "Open a session" });
    tile.onclick = () => RT.wm.tile();
    plus.onclick = () => RT.menu.toggle();
    this.tileBtn = tile;
    this.el.append(this.items, this.sep, tile, plus);
    layer.append(this.el);
    RT.menu.init(layer);

    let leaveTimer = null;
    window.addEventListener("pointermove", (e) => {
      const near = e.clientY >= window.innerHeight - HOT || Boolean(e.target.closest && e.target.closest(".rt-dock"));
      if (near) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
        if (!this.hover) {
          this.hover = true;
          this.render();
        }
      } else if (this.hover && !leaveTimer) {
        leaveTimer = setTimeout(() => {
          leaveTimer = null;
          this.hover = false;
          this.render();
        }, LINGER);
      }
    }, { capture: true, passive: true });
    this.render();
  },

  render() {
    if (!this.el) return;
    const wins = [...RT.wm.wins.values()];
    const minimised = wins.filter((w) => w.min);
    this.items.replaceChildren(
      ...minimised.map((w) => {
        const s = RT.control.find(w.tmux);
        const chip = RT.el("button", "rt-chip", { title: "Restore " + w.label, "data-tmux": w.tmux });
        chip.append(RT.el("span", "rt-dot" + (s && s.busy ? " busy" : "")), RT.el("span", "rt-chip-label", { text: w.label }));
        chip.onclick = () => {
          w.restore();
          w.focus();
        };
        return chip;
      })
    );
    this.sep.style.display = minimised.length ? "" : "none";
    this.tileBtn.disabled = !wins.length;
    this.el.classList.toggle("show", this.hover || minimised.length > 0 || RT.menu.isOpen());
  },
};
