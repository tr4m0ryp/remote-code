// Keyboard: Ctrl+Alt+L toggles the latency readout; Ctrl+` minimises or restores every window (VS Code's own panel toggle only runs when no
// window is open). Keys typed inside the overlay stop at its layer, so the workbench's keybindings
// never see them and Escape reaches the terminal.
RT.keys = {
  init(layer) {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && !e.metaKey && e.code === "KeyL") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return RT.latency.toggle(layer);
      }
      if (e.code !== "Backquote" || !e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || !RT.wm.count()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      RT.wm.toggleAll();
    }, true);
    for (const type of ["keydown", "keyup", "keypress"]) layer.addEventListener(type, (e) => e.stopPropagation());
  },
};
