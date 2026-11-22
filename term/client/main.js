// Boot: probe the service first (it is absent when the editor is opened without the proxy, and then
// the overlay stays silent), then build the layer, restore saved windows and follow the control channel.
(async function boot() {
  try {
    const r = await fetch("/term/api/sessions", { credentials: "same-origin", redirect: "error" });
    if (!r.ok) return;
    RT.control.sessions = (await r.json()).sessions || [];
  } catch {
    return;
  }
  const layer = RT.el("div", "rt-layer");
  document.body.append(layer);
  RT.wm.init(layer);
  RT.keys.init(layer);
  RT.control.on("sessions", (list) => {
    RT.wm.onSessions(list);
  });
  // Open requests (a click on a session in the editor's Sessions panel) open the window, or restore
  // and focus it when minimised. They reach every editor tab; only a visible one acts.
  RT.control.on("open", (tmux) => document.visibilityState === "visible" && RT.wm.open(tmux));
  RT.wm.restoreAll();
  // Saved windows are placed before the workbench has drawn its status bar; once it exists, snapped
  // windows are fitted again to the real work area.
  let tries = 0;
  const settle = setInterval(() => {
    if (document.querySelector(".part.statusbar") || ++tries > 60) {
      clearInterval(settle);
      RT.wm.wins.forEach((w) => w.relayout());
    }
  }, 250);
  RT.control.start();
  window.remoteTerm = {
    open: (tmux) => RT.wm.open(tmux),
    toggleAll: () => RT.wm.toggleAll(),
    windows: () => [...RT.wm.wins.values()].map((w) => ({ tmux: w.tmux, rect: { ...w.rect }, mode: w.mode, min: w.min })),
  };
})();
