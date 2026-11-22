#!/usr/bin/env bash
# Builds the Remote Sessions extension, installs it into code-server, and (re)starts code-server
# on the live multi-root workspace that the extension keeps in sync with running Claude sessions.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
data="$HOME/.local/share/code-server"
live="$data/live.code-workspace"

mkdir -p "$data/User" "$HOME/.config/code-server" "$HOME/.config/systemd/user"
[ -f "$live" ] || printf '{\n  "folders": [],\n  "settings": {}\n}\n' > "$live"
# Merge the editor defaults into settings.json, keeping anything else the user set.
# VS Code's own AI chat is switched off: prompts go to the Claude sessions, never a second harness.
node - "$data/User/settings.json" <<'JS'
const fs = require("fs"), f = process.argv[2];
let cur = {}; try { cur = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
const defaults = {
  "workbench.colorTheme": "Default Dark Modern",
  "workbench.startupEditor": "none",
  "security.workspace.trust.enabled": false,
  "git.autoRepositoryDetection": "openEditors",
  "files.watcherExclude": { "**/node_modules/**": true, "**/.venv/**": true, "**/data/**": true },
};
const forced = {
  "chat.disableAIFeatures": true,
  "chat.commandCenter.enabled": false,
  "chat.agent.enabled": false,
  "inlineChat.enabled": false,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "workbench.layoutControl.enabled": false,
  "workbench.tips.enabled": false,
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "window.commandCenter": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "update.mode": "none",
  "telemetry.telemetryLevel": "off",
  "github.gitAuthentication": false,
  "git.openRepositoryInParentFolders": "never",
};
fs.writeFileSync(f, JSON.stringify({ ...defaults, ...cur, ...forced }, null, 2) + "\n");
JS

# Strip bundled extensions that do not belong in a session viewer: the AI assistant (prompts go to the
# Claude sessions only), cloud sign-in and tunnels, debuggers, task runners, and surplus themes.
# Re-run after every code-server upgrade, which restores them.
builtin="$HOME/.local/lib/code-server/lib/vscode/extensions"
for ext in copilot prompt-basics \
  github github-authentication microsoft-authentication tunnel-forwarding \
  debug-auto-launch debug-server-ready ms-vscode.js-debug ms-vscode.js-debug-companion ms-vscode.vscode-js-profile-table \
  npm grunt gulp jake simple-browser extension-editing \
  theme-abyss theme-kimbie-dark theme-monokai theme-monokai-dimmed theme-quietlight theme-red \
  theme-solarized-dark theme-solarized-light theme-tomorrow-night-blue; do
  rm -rf "${builtin:?}/$ext"
done

cp "$here/deploy/code-server.config.yaml" "$HOME/.config/code-server/config.yaml"
sed "s|^ExecStart=.*|ExecStart=$HOME/.local/bin/code-server $live|" "$here/deploy/code-server.service" \
  > "$HOME/.config/systemd/user/code-server.service"

cd "$here/extension"
version=$(node -p 'require("./package.json").version')
npx --yes @vscode/vsce@latest package --skip-license --allow-missing-repository -o "/tmp/remote-sessions-$version.vsix" >/dev/null
code-server --install-extension "/tmp/remote-sessions-$version.vsix" --force
rm -f "/tmp/remote-sessions-$version.vsix"

systemctl --user daemon-reload
systemctl --user enable code-server.service >/dev/null
systemctl --user restart code-server.service
echo "installed remote-sessions $version; code-server restarted on $live"
