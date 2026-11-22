# remote-code

A browser code editor for a cloud dev machine, organised around the Claude sessions running on it.

## Why

I moved all my development to a cloud instance. Storage upgrades, GPUs, backups and network speed are all one setting away, and with Claude remote I manage projects from any device. One problem remained: **seeing the code**. The usual route was pushing to GitHub and pulling on a laptop just to read what an agent wrote. That is slow and clumsy.

remote-code fixes that. Host it on a `code.*` subdomain of your instance and every project an agent is working on is one click away in the browser.

## What it is

- **code-server**: VS Code running on the instance, served in the browser behind Caddy and the shared login of the instance's manager dashboard.
- **Remote Sessions extension**: a sidebar listing every running Claude Code session, grouped by project, with branch and changed-file count.
- **Live workspace**: each project with a running session is kept open as a workspace folder automatically. A session starts, its project appears; it ends, the project leaves.
- **Prompt a session**: a "Claude Sessions" panel under the Explorer shows the sessions working in the project you have open, their live status and last output, and a prompt box. The prompt is typed into that session's own terminal, so it runs through your Claude harness with its hooks and skills, never through a VS Code assistant.
- **Watch**: open a read-only terminal on a session's tmux pane to follow the agent live.
- **Stripped editor**: VS Code's built-in AI chat, Copilot, cloud sign-in, debuggers, task runners and surplus themes are deleted from the install. What remains is an editor and the sessions.

## Install

Needs `code-server`, `node`, `tmux` and Caddy on the instance.

```bash
./deploy/install.sh   # packages the extension, installs it, starts code-server on 127.0.0.1:8795
```

Then add `deploy/husimi-sso.caddy` and the site block in `deploy/code.husimi.ai.caddy` to your Caddyfile with your own domain, and reload Caddy. The snippet sends every request through a `forward_auth` check (`GET /auth/verify`) on your login service, which redirects to its login page when there is no session. Any other hosted project gets the same login with `import husimi_sso`.

## License

remote-code is **source-available**, licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE) — **not** an OSI open-source license.

- **You may** use, modify, fork, and share remote-code freely for any **noncommercial** purpose, as long as you keep the copyright and `Required Notice:` lines (see [`NOTICE`](./NOTICE)) and credit *"remote-code by Keygraph, Inc."*
- **You may not** sell it, bundle it into a paid product, or run it as a paid/hosted service **without a commercial license**.

Copyright (c) 2026 Keygraph, Inc. Commercial licensing enquiries: see [`NOTICE`](./NOTICE).
