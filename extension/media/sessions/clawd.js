// Clawd, the Claude Code mascot, as a 3-row block-character sprite for the Sessions panel. The glyph
// strings below come from Claude Code's own mascot (Claude Code 2.1.330); swap this file to change
// the art. Clawd(pre) renders into a <pre>; set(state) picks the animation: working, idle,
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
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sprite(arms, eyes, feet) {
    const a = ARMS[arms];
    return [(a.r1L + EYES[eyes] + a.r1R).padEnd(WIDTH), a.r2L + BODY + a.r2R, FEET[feet]];
  }

  class Clawd {
    constructor(pre, spinnerEl) {
      this.pre = pre;
      this.spinnerEl = spinnerEl;
      this.timers = [];
      this.state = null;
    }

    draw(rows) {
      const text = rows.join("\n");
      if (this.pre.textContent !== text) this.pre.textContent = text;
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

  window.Clawd = Clawd;
})();
