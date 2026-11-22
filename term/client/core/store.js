// Window state per tmux session in localStorage, so open windows come back after a reload.
const KEY = "remoteTerm.windows.v1";

RT.store = {
  load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  },
  save(map) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map));
    } catch {}
  },
};
