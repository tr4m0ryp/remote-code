# remote-code: project conventions

Browser code editor at https://code.husimi.ai for viewing and editing the projects that the
Claude remote-control sessions on this host are working in.

- **Editor:** code-server (VS Code in the browser), user systemd unit on 127.0.0.1:8795,
  public via Caddy `code.husimi.ai`, gated by the manager's SSO (`import husimi_sso`, snippet in
  `/etc/caddy/husimi-sso.caddy` = `deploy/husimi-sso.caddy`; manager `/auth/verify`, cookie `mgr_sso`).
  Ports 8790 (manager) and 8791 (another node service) are taken.
- **extension/**: the `husimi.remote-sessions` VS Code extension, plain CommonJS, no deps.
  `discovery/` finds `claude` processes (ps + /proc/<pid>/cwd), maps them to tmux sessions and
  git roots; `views/` is the sidebar tree; `workspace/` keeps one folder per live project in
  the multi-root workspace `~/.local/share/code-server/live.code-workspace`.
- **deploy/**: unit, config, Caddy block (hash redacted) and `install.sh`, which packages and
  installs the extension and restarts code-server. Run it after every extension change.
- DNS: Cloudflare zone husimi.ai, token in `~/.config/cloudflare/husimi.env`; it is IPv4-only,
  so call the API with `curl -4`.

## Rules
- Never print, log or commit secrets; they live in `.env` (gitignored).
- Max 300 lines per source file (split near 200); domain-hierarchical tree; each package
  root re-exports its public names. No new scaffold .md files.
