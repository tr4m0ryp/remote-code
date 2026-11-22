# remote-code: project conventions

Scope not yet defined; record the goal here once it is set.

## Rules
- Never print, log or commit secrets; they live in `.env` (gitignored).
- Max 300 lines per source file (split near 200); domain-hierarchical tree; each package
  root re-exports its public names. No new scaffold .md files.
