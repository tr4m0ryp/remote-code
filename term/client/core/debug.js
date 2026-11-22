// Latency readout: RTT samples from the control channel's ping, logged to the console and shown in
// a small overlay toggled with Ctrl+Alt+L.
RT.latency = {
  samples: [],
  last: 0,
  el: null,

  add(ms) {
    this.last = ms;
    this.samples.push(ms);
    if (this.samples.length > 60) this.samples.shift();
    if (this.el) this.render();
    if (this.logging) console.log("remote-term rtt " + ms.toFixed(1) + " ms");
  },

  median() {
    const s = [...this.samples].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  },

  render() {
    const s = this.samples;
    const p95 = s.length ? [...s].sort((a, b) => a - b)[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0;
    this.el.textContent = `rtt ${this.last.toFixed(1)} ms  median ${this.median().toFixed(1)}  p95 ${p95.toFixed(1)}  (n=${s.length})`;
  },

  toggle(layer) {
    if (this.el) {
      this.el.remove();
      this.el = null;
      this.logging = false;
      return;
    }
    this.el = RT.el("div", "rt-debug");
    layer.append(this.el);
    this.logging = true;
    this.render();
  },
};
