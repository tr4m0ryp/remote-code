// Control websocket: receives the session list and "open" requests; reconnects with backoff.
RT.control = {
  sessions: [],
  listeners: { sessions: [], open: [] },

  on(type, fn) {
    this.listeners[type].push(fn);
  },

  emit(type, v) {
    for (const fn of this.listeners[type]) {
      try {
        fn(v);
      } catch (err) {
        console.warn("remote-term:", err);
      }
    }
  },

  find(tmux) {
    return this.sessions.find((s) => s.tmux === tmux) || null;
  },

  start() {
    let delay = 1000;
    const connect = () => {
      const ws = new WebSocket(RT.wsUrl("/term/ws/control"));
      ws.onopen = () => (delay = 1000);
      ws.onmessage = (e) => {
        let m;
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.type === "sessions" && Array.isArray(m.sessions)) {
          this.sessions = m.sessions;
          this.emit("sessions", m.sessions);
        } else if (m.type === "open" && typeof m.tmux === "string") {
          this.emit("open", m.tmux);
        }
      };
      ws.onclose = () => {
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30000);
      };
    };
    connect();
  },
};
