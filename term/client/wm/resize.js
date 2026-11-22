// Edge and corner resizing. Resizing a snapped window frees it into a normal one. The frame follows
// the pointer once per animation frame; the terminal is refitted (and the pty resized, which makes
// Claude redraw) only once, on pointerup.
RT.attachResize = function (win) {
  for (const handle of win.root.querySelectorAll(".rt-h")) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      win.focus();
      if (win.mode !== "normal") win.setMode("normal", { ...win.rect });
      const dir = handle.dataset.dir;
      const s = { px: e.clientX, py: e.clientY, ...win.rect };
      handle.setPointerCapture(e.pointerId);
      RT.wm.shield(true, getComputedStyle(handle).cursor);
      RT.wm.resizing = true;
      let target = null;
      let frame = 0;
      const move = (ev) => {
        const dx = ev.clientX - s.px;
        const dy = ev.clientY - s.py;
        let { x, y, w, h } = s;
        if (dir.includes("e")) w = Math.max(RT.MIN_W, s.w + dx);
        if (dir.includes("s")) h = Math.max(RT.MIN_H, s.h + dy);
        if (dir.includes("w")) {
          w = Math.max(RT.MIN_W, s.w - dx);
          x = s.x + s.w - w;
        }
        if (dir.includes("n")) {
          y = RT.clamp(s.y + dy, RT.area().y, s.y + s.h - RT.MIN_H);
          h = s.y + s.h - y;
        }
        target = { x, y, w, h };
        if (!frame) frame = requestAnimationFrame(() => ((frame = 0), win.place(target)));
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        cancelAnimationFrame(frame);
        if (target) win.place(target);
        RT.wm.shield(false);
        RT.wm.resizing = false;
        win.fit();
        RT.wm.persist();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }
};
