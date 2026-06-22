# Contributing

Internal notes for developing **bitbucket-mcp**. End-user setup is in [README.md](README.md).

Maintainer agent context: load the `bitbucket-mcp-dev` skill when editing this repo. It ships in git only (not in the npm package).

## Scope

PR workflow tools — not a full Bitbucket API mirror. Shippable agent skills live in `skills/` for users to copy into their projects.

End-user install is `mcp.json` only (`BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG` in env). Config file is optional for reviewer overrides.

## Layout

```
src/
  types/        shared TypeScript types (domain + MCP inputs)
  config/       config load, auth, paths
  bitbucket/    API client, PRs, reviewers, comments
  watch/        lifecycle watch state (~/.config/bitbucket-mcp/pr-watch.json)
  mcp/          tool parsers, registration, server
  hooks/        Cursor stop hook entry
templates/      mcp.json + hooks.json snippets
skills/         shippable agent skills
```

## Commands

```bash
yarn              # install + build (prepare)
yarn build        # compile only
yarn typecheck    # tsc --noEmit
yarn init-config  # seed ~/.config/bitbucket-mcp/config.json (optional)
node dist/index.js
```

## Adding a tool

1. Add Bitbucket types in `src/types/bitbucket.ts` if the API response is new.
2. Implement API call in `src/bitbucket/`.
3. Add MCP input type in `src/types/tools.ts` + parser in `src/mcp/parsers.ts`.
4. Register in `src/mcp/register-tools.ts`.
5. Update README tool table and relevant skill in `skills/`.

## Security constraints

`src/bitbucket/api-client.ts` blocks requests outside the configured repo prefix plus `/user` and `/users/`. Extend `assertAllowedApiUrl` deliberately when adding endpoints.
