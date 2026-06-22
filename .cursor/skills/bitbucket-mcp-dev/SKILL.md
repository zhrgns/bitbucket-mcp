---
name: bitbucket-mcp-dev
description: >-
  Maintainer context for the bitbucket-mcp repository. Load when editing this
  repo — architecture, conventions, and decisions from initial build. Not for
  end users; they use skills/ and README.md.
---

# bitbucket-mcp — maintainer context

Agent skill for **working on this repository**. End-user docs: `README.md`. Dev commands: `CONTRIBUTING.md`.

## Two audiences (do not mix)

| Audience | Where |
| -------- | ----- |
| End users | `README.md`, `templates/`, `skills/` |
| Maintainers | `CONTRIBUTING.md`, `.cursor/skills/bitbucket-mcp-dev/`, `src/` |

README = install + tools + downloadable skills only. No yarn/build/dev sections.

## Product scope

- **Not** a full Bitbucket API mirror — PR workflow only
- Repo-scoped: one `BITBUCKET_WORKSPACE` + `BITBUCKET_REPO_SLUG` per mcp.json entry
- API allowlist in `src/bitbucket/api-client.ts` — extend deliberately
- No company-specific names or examples in repo (generic `acme-corp` / `mobile-app`)

## Install model (users)

Single `mcp.json` block — no clone required for MCP:

```json
"command": "npx",
"args": ["-y", "bitbucket-mcp"],
"env": {
  "BITBUCKET_USERNAME": "...",
  "BITBUCKET_TOKEN": "...",
  "BITBUCKET_WORKSPACE": "...",
  "BITBUCKET_REPO_SLUG": "..."
}
```

Until npm publish: `"args": ["-y", "github:zhrgns/bitbucket-mcp"]`. Package name in `package.json` is `bitbucket-mcp`; align README scoped name (`@zhrgns/...`) when publishing.

Optional `~/.config/bitbucket-mcp/config.json` — reviewer overrides only. Repo identity from env first.

## Shippable skills (`skills/`)

Users copy into `.cursor/skills/`:

| Skill | Purpose |
| ----- | ------- |
| `bitbucket-pr` | Open PR |
| `bitbucket-pr-review` | Comment fix + resolve loop |
| `bitbucket-babysit` | Full lifecycle until merge-ready |

Do **not** remove `skills/` from `package.json` `files`. No `bitbucket-pre-pr` (rejected — empty value).

This file (`.cursor/skills/bitbucket-mcp-dev/`) is **maintainer-only** — not copied by users.

## Code layout

```
src/types/      JSDoc on types — module + field docs
src/config/     load.ts, paths.ts, auth.ts (not credentials.ts — editor hook)
src/bitbucket/  api-client, pull-requests, reviewers, comments
src/watch/      PrLifecycleWatch, modes: approval | review | babysit
src/mcp/        parsers, register-tools, server
src/hooks/      watch-hook.ts — npx via templates/hooks.json
```

## Watch / hook

- State: `~/.config/bitbucket-mcp/pr-watch.json`
- `startLifecycleWatch(mode, input)` — no deprecated aliases (pre-release)
- Hook emits `followup_message` per mode; uses `npx --package bitbucket-mcp bitbucket-mcp-watch-hook`
- Cursor keeps loop alive via stop hook — not a background daemon

## Tooling

- **yarn** only (not npm) for dev: `yarn`, `yarn build`, `yarn typecheck`
- `prepare` runs `yarn build`
- Pagination loops: explicit type on `page` (`BitbucketCommentList`, `PaginatedUsers`) — avoids TS7022

## When adding a tool

1. Types → `src/types/bitbucket.ts` / `tools.ts`
2. API → `src/bitbucket/`
3. Parser → `src/mcp/parsers.ts`
4. Register → `src/mcp/register-tools.ts`
5. README tool table + update matching `skills/*` skill
6. Hook follow-up in `src/hooks/watch-hook.ts` if watch-related

## Roadmap (not done)

- PR merge / decline tools
- Pipeline / build status
- `bitbucket-pre-pr` — dropped

## Gitignore

Never commit: credentials, local `config.json` with secrets, `node_modules/`, `dist/` (built on install). `.cursor/skills/bitbucket-mcp-dev/` **is** committed.
