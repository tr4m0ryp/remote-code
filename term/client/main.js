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
  RT.dock.init(layer);
  RT.keys.init(layer);
  RT.control.on("sessions", (list) => {
    RT.wm.onSessions(list);
    RT.dock.render();
    if (RT.menu.isOpen()) RT.menu.render();
  });
  RT.control.on("open", (tmux) => RT.wm.open(tmux));
  RT.wm.restoreAll();
  RT.control.start();
  window.remoteTerm = {
    open: (tmux) => RT.wm.open(tmux),
    tile: () => RT.wm.tile(),
    toggleAll: () => RT.wm.toggleAll(),
    windows: () => [...RT.wm.wins.values()].map((w) => ({ tmux: w.tmux, rect: { ...w.rect }, mode: w.mode, min: w.min })),
  };
})();
