// Title-bar dragging with edge snapping: the left/right screen edge snaps the window to that half.
// Dragging a snapped window first restores its normal size under the pointer. While dragging, the
// window moves by a compositor-only transform written once per animation frame; left/top are
// committed on pointerup, so the workbench underneath never relayouts.
const EDGE = 6;

function snapAt(ev) {
  if (ev.clientX <= EDGE) return "left";
  if (ev.clientX >= window.innerWidth - EDGE) return "right";
  return null;
}

RT.attachDrag = function (win) {
  const bar = win.f.bar;
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".rt-lights")) return;
    e.preventDefault();
    win.focus();
    const s = { px: e.clientX, py: e.clientY, x: win.rect.x, y: win.rect.y, w: win.rect.w, h: win.rect.h };
    let moved = false;
    let snap = null;
    let target = null;
    let frame = 0;
    const paint = () => {
      frame = 0;
      win.root.style.transform = `translate3d(${target.x - win.rect.x}px, ${target.y - win.rect.y}px, 0)`;
    };
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
      target = { x: s.x + dx, y: RT.clamp(s.y + dy, a.y, a.y + a.h - 30), w: s.w, h: s.h };
      if (!frame) frame = requestAnimationFrame(paint);
      const next = snapAt(ev);
      if (next !== snap) RT.wm.preview((snap = next));
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
      if (!moved) return;
      cancelAnimationFrame(frame);
      win.root.style.transform = "";
      if (target) win.place(target);
      RT.wm.shield(false);
      RT.wm.preview(null);
      win.root.classList.remove("rt-dragging");
      if (snap) win.snap(snap);
      RT.wm.persist();
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  });
};
