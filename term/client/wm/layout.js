// Window geometry: halves for edge snapping, a cascade for new windows, and clamping so a title bar
// always stays reachable.
RT.layout = {
  half(side) {
    const a = RT.area();
    const w = Math.floor(a.w / 2);
    return { x: side === "left" ? a.x : a.x + a.w - w, y: a.y, w, h: a.h };
  },

  cascade(i) {
    const a = RT.area();
    const step = 32 * (i % 8);
    const w = Math.min(960, a.w - 160);
    const h = Math.min(600, a.h - 120);
    return this.fit({ x: Math.round((a.w - w) / 2) - 112 + step, y: 60 + step, w, h });
  },

  fit(r) {
    const a = RT.area();
    const w = RT.clamp(r.w, RT.MIN_W, a.w);
    const h = RT.clamp(r.h, RT.MIN_H, a.h);
    return { x: RT.clamp(r.x, a.x - w + 120, a.x + a.w - 120), y: RT.clamp(r.y, a.y, a.y + a.h - 30), w, h };
  },
};
