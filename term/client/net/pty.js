// One pty websocket per window: binary output frames go straight to the terminal; keystrokes go out
// at once as binary frames; resize, scroll and compose-mode prompts as JSON text frames. Reconnects
// after network drops; reports "ended" (tmux client exited) and "gone" (no such session) to the
// window. Close codes 4000/4404 come from term/src/ws/pty.js.
const encoder = new TextEncoder();
RT.PtyConn = class {
  constructor(tmux, size, handlers) {
    this.tmux = tmux;
    this.h = handlers;
    this.closed = false;
    this.tries = 0;
    this.opened = false;
    this.open(size);
  }

  open(size) {
    const q = new URLSearchParams({ session: this.tmux, cols: size.cols, rows: size.rows });
    const ws = (this.ws = new WebSocket(RT.wsUrl("/term/ws/pty?" + q)));
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      this.tries = 0;
      this.h.onOpen(this.opened);
      this.opened = true;
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== "string") return this.h.onData(new Uint8Array(e.data));
      try {
        const m = JSON.parse(e.data);
        if (m.t === "prompt" && this.h.onPrompt) this.h.onPrompt(m);
      } catch {}
    };
    ws.onclose = (e) => {
      if (this.closed || ws !== this.ws) return;
      if (e.code === 4404) return this.h.onGone();
      if (e.code === 4000 || this.tries >= 8) return this.h.onEnded();
      this.h.onStatus("reconnecting");
      const wait = Math.min(500 * 2 ** this.tries++, 15000);
      setTimeout(() => !this.closed && this.open(this.h.size()), wait);
    };
  }

  send(m) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  input(d) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(encoder.encode(d));
  }

  prompt(text, id) {
    this.send({ t: "prompt", text, id });
  }

  resize(c, r) {
    this.send({ t: "r", c, r });
  }

  scroll(n) {
    this.send({ t: "s", n });
  }

  close() {
    this.closed = true;
    if (this.ws) this.ws.close(1000);
  }
};
