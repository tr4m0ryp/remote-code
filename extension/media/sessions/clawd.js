// Clawd, the Claude Code mascot, for the Sessions panel. The glyph strings below come from Claude
// Code's own mascot (Claude Code 2.1.330); swap this file to change the art. Each 3-row, 9-column
// glyph sprite is turned into a pixel grid (a cell is 2x4 units, a quadrant block fills 1x2-unit
// quadrants, "▂" fills the cell's bottom unit) and drawn as a crisp SVG, so it never depends on
// font metrics. Clawd(svg) renders into an <svg>; set(state) picks the animation: working, idle,
// sleeping, finished (once, then idle) and spin (turn-around once, then the given state).
(function () {
  const ARMS = {
    down: { r1L: " ▐", r1R: "", r2L: "▝▜", r2R: "█▀" },
    up: { r1L: "▗▟", r1R: "▄", r2L: " ▜", r2R: "█▘" },
    oneUp: { r1L: " ▐", r1R: "▄", r2L: "▝▜", r2R: "█▘" },
  };
  const EYES = { open: "▛███▛█", left: "▟███▟█", right: "█▟███▟", closed: "▂███▂█", wink: "▛███▂█" };
  const BODY = "█████";
  const FEET = { both: " ▝▝   ▝▝ ", left: " ▝▝      ", right: "      ▝▝ " };
  const TURN = [
    [" ▐█▜██▛█ ", "▝▜██████▀", " ▝▝   ▝▝ "], // right-12
    ["  █▛██▛▌ ", " ▝█████▛ ", "  ▘▘  ▘▘ "], // right-30
    ["  ▐█▛█▜  ", "  ▐████  ", "  ▝▝ ▝▝  "], // right-55
    ["   ██▛▌  ", "   ███▌  ", "   ▘  ▘  "], // right-75
    ["   ▐██   ", "   ▐██   ", "   ▝ ▝   "], // edge
    ["   ███▌  ", "   ███▌  ", "   ▘  ▘  "], // back-105
    ["  ▐████  ", "  ▐████  ", "  ▝▝ ▝▝  "], // back-125
    ["  █████▌ ", " ▝█████▛ ", "  ▘▘  ▘▘ "], // back-150
    [" ▐██████ ", "▝▜██████▀", " ▝▝   ▝▝ "], // back
    ["   ▛██▌  ", "   ███▌  ", "   ▘  ▘  "], // left-75
    ["  ▐▜▛██  ", "  ▐████  ", "  ▝▝ ▝▝  "], // left-55
    ["  ▛██▛█▌ ", " ▝█████▛ ", "  ▘▘  ▘▘ "], // left-30
    [" ▐▛███▜█ ", "▝▜██████▀", " ▝▝   ▝▝ "], // left-12
  ];
  const SPIN = ["·", "✢", "✳", "✶", "✻", "✽"];
  const SPINNER = SPIN.concat(SPIN.slice().reverse()); // forward, then reversed
  const WIDTH = 9;
  const UNITS_H = 10; // 3 rows x 4 units, minus the feet row's always-empty bottom half
  // Quadrants per block glyph: top-left, top-right, bottom-left, bottom-right.
  const QUAD = {
    "▘": [1, 0, 0, 0], "▝": [0, 1, 0, 0], "▖": [0, 0, 1, 0], "▗": [0, 0, 0, 1], "▌": [1, 0, 1, 0],
    "▐": [0, 1, 0, 1], "▀": [1, 1, 0, 0], "▄": [0, 0, 1, 1], "▛": [1, 1, 1, 0], "▜": [1, 1, 0, 1],
    "▙": [1, 0, 1, 1], "▟": [0, 1, 1, 1], "▚": [1, 0, 0, 1], "▞": [0, 1, 1, 0], "█": [1, 1, 1, 1],
  };
  const SVG = "http://www.w3.org/2000/svg";

  // Glyph rows -> rows of 0/1 units (WIDTH*2 wide, 4 units per glyph row).
  function pixels(rows) {
    const g = Array.from({ length: rows.length * 4 }, () => new Array(WIDTH * 2).fill(0));
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * 2;
      const y = r * 4;
      if (ch === "▂") return (g[y + 3][x] = g[y + 3][x + 1] = 1);
      const q = QUAD[ch];
      if (!q) return;
      [[0, 0], [1, 0], [0, 2], [1, 2]].forEach(([dx, dy], i) => {
        if (q[i]) g[y + dy][x + dx] = g[y + dy + 1][x + dx] = 1;
      });
    }));
    return g.slice(0, UNITS_H);
  }
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sprite(arms, eyes, feet) {
    const a = ARMS[arms];
    return [(a.r1L + EYES[eyes] + a.r1R).padEnd(WIDTH), a.r2L + BODY + a.r2R, FEET[feet]];
  }

  class Clawd {
    constructor(svg, spinnerEl) {
      this.svg = svg;
      svg.setAttribute("viewBox", `0 0 ${WIDTH * 2} ${UNITS_H}`);
      svg.setAttribute("shape-rendering", "crispEdges");
      this.key = "";
      this.spinnerEl = spinnerEl;
      this.timers = [];
      this.state = null;
    }

    // One rect per horizontal run of filled units.
    draw(rows) {
      const key = rows.join("\n");
      if (key === this.key) return;
      this.key = key;
      const rects = [];
      pixels(rows).forEach((line, y) => {
        for (let x = 0; x < line.length; x++) {
          if (!line[x]) continue;
          let end = x;
          while (line[end + 1]) end++;
          const r = document.createElementNS(SVG, "rect");
          r.setAttribute("x", x);
          r.setAttribute("y", y);
          r.setAttribute("width", end - x + 1);
          r.setAttribute("height", 1);
          rects.push(r);
          x = end;
        }
      });
      this.svg.replaceChildren(...rects);
    }

    clear() {
      for (const t of this.timers) clearTimeout(t), clearInterval(t);
      this.timers = [];
      if (this.spinnerEl) this.spinnerEl.textContent = "";
    }

    later(fn, ms) {
      this.timers.push(setTimeout(fn, ms));
    }

    every(fn, ms) {
      this.timers.push(setInterval(fn, ms));
    }

    // working | idle | sleeping | finished | spin; `then` is the state after a one-shot animation.
    set(state, then) {
      this.clear();
      this.state = state;
      if (state === "working") return this.working();
      if (state === "sleeping") return this.draw(sprite("down", "closed", "both"));
      if (state === "finished") {
        this.draw(sprite("up", "wink", "both"));
        return still() ? this.set(then || "idle") : this.later(() => this.set(then || "idle"), 2000);
      }
      if (state === "spin" && !still()) {
        let i = 0;
        this.after = then || "idle"; // callers may update it while the turn plays
        this.draw(TURN[0]);
        return this.every(() => (++i < TURN.length ? this.draw(TURN[i]) : this.set(this.after)), 60);
      }
      this.idle();
    }

    working() {
      if (this.spinnerEl) this.spinnerEl.textContent = "✻";
      if (still()) return this.draw(sprite("down", "open", "both"));
      let step = 0;
      let spin = 0;
      const walk = () => this.draw(sprite(step % 2 ? "oneUp" : "down", "open", step % 2 ? "right" : "left"));
      walk();
      this.every(() => (step++, walk()), 250);
      this.every(() => (this.spinnerEl.textContent = SPINNER[spin++ % SPINNER.length]), 120);
    }

    // Open eyes, a blink (150 ms) every 3-6 s, and now and then a glance to one side.
    idle() {
      this.draw(sprite("down", "open", "both"));
      if (still()) return;
      const next = () =>
        this.later(() => {
          const glance = Math.random() < 0.25;
          this.draw(sprite("down", glance ? (Math.random() < 0.5 ? "left" : "right") : "closed", "both"));
          this.later(() => (this.draw(sprite("down", "open", "both")), next()), glance ? 700 : 150);
        }, 3000 + Math.random() * 3000);
      next();
    }
  }

  Clawd.pixels = pixels; // for checks
  Clawd.sprite = sprite;
  window.Clawd = Clawd;
})();
