// Window geometry: halves for edge snapping, the full area for maximise, a grid for Tile, a cascade
// for new windows, and clamping so a title bar always stays reachable.
const GAP = 8;

RT.layout = {
  full() {
    const a = RT.area();
    return { x: a.x, y: a.y, w: a.w, h: a.h };
  },

  half(side) {
    const a = RT.area();
    const w = Math.floor(a.w / 2);
    return { x: side === "left" ? a.x : a.x + a.w - w, y: a.y, w, h: a.h };
  },

  // Side by side for up to three windows when each column stays wide; a near-square grid otherwise.
  // The last row stretches its windows to fill the width.
  grid(n) {
    const a = RT.area();
    const cols = n <= 3 && a.w / n >= 520 ? n : Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const h = Math.floor((a.h - GAP * (rows + 1)) / rows);
    const rects = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const inRow = row === rows - 1 ? n - row * cols : cols;
      const w = Math.floor((a.w - GAP * (inRow + 1)) / inRow);
      const col = i - row * cols;
      rects.push({ x: a.x + GAP + col * (w + GAP), y: a.y + GAP + row * (h + GAP), w, h });
    }
    return rects;
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
