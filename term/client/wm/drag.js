// Title-bar dragging with edge snapping: the left/right screen edge snaps to a half, the top edge
// maximises. Dragging a maximised or snapped window first restores its size under the pointer.
// Double-clicking the title bar toggles maximise, as on macOS.
const EDGE = 6;

function snapAt(ev) {
  if (ev.clientX <= EDGE) return "left";
  if (ev.clientX >= window.innerWidth - EDGE) return "right";
  if (ev.clientY <= EDGE) return "max";
  return null;
}

RT.attachDrag = function (win) {
  const bar = win.f.bar;
  bar.addEventListener("dblclick", (e) => {
    if (!e.target.closest(".rt-lights")) win.toggleMax();
  });
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".rt-lights")) return;
    e.preventDefault();
    win.focus();
    const s = { px: e.clientX, py: e.clientY, x: win.rect.x, y: win.rect.y, w: win.rect.w, h: win.rect.h };
    let moved = false;
    let snap = null;
    bar.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - s.px;
      const dy = ev.clientY - s.py;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        RT.wm.shield(true, "default");
        win.root.classList.add("rt-dragging");
        if (win.mode !== "normal") {
          const r = win.normalRect();
          s.x = s.px - ((s.px - s.x) / s.w) * r.w;
          s.w = r.w;
          s.h = r.h;
          win.setMode("normal", { x: s.x, y: s.y, w: s.w, h: s.h });
        }
      }
      const a = RT.area();
      win.place({ x: s.x + dx, y: RT.clamp(s.y + dy, a.y, a.y + a.h - 30), w: s.w, h: s.h });
      snap = snapAt(ev);
      RT.wm.preview(snap);
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
      if (!moved) return;
      RT.wm.shield(false);
      RT.wm.preview(null);
      win.root.classList.remove("rt-dragging");
      if (snap === "max") win.maximise();
      else if (snap) win.snap(snap);
      RT.wm.persist();
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  });
};
