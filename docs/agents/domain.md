# Domain docs

This repository uses a single-context domain-doc layout.

## Lookup order

- Read root `CONTEXT.md` if it exists.
- Read architectural decisions under root `docs/adr/` if they exist.
- If domain docs are absent, fall back to `AGENTS.md` for repository conventions and current domain guidance.

## Current state

- No root `CONTEXT.md` exists yet.
- No root `CONTEXT-MAP.md` exists yet.
- No root `docs/adr/` directory exists yet.

## Working rules

- Treat `AGENTS.md` as the source of truth for repository shape, generated data flow, and implementation conventions until dedicated domain docs are added.
- If a future `CONTEXT.md` conflicts with `AGENTS.md`, ask the user which source is current before making domain-sensitive changes.
- Do not create ADRs automatically; propose one when a decision is architectural, persistent, or likely to affect future agents.
