# bitbucket-mcp

Cursor MCP server for **Bitbucket Cloud** — create/list PRs, check approvals, optional PR approval watch via Cursor stop hook.

## Features

- Create PR with automatic reviewer resolution (effective defaults + author + extras)
- List/filter PRs by source branch and state
- Get approval status by PR id or source branch
- Optional approval watch loop (Cursor `stop` hook + Jira MCP)

## Minimal setup

```bash
git clone https://github.com/YOUR_ORG/bitbucket-mcp.git
cd bitbucket-mcp
npm install
npm run init-config
# edit ~/.config/bitbucket-mcp/config.json
npm link   # optional: global bins for watch hook
```

### 1. Config

`~/.config/bitbucket-mcp/config.json`:

```json
{
  "repository": {
    "workspace": "your-workspace",
    "slug": "your-repo"
  },
  "reviewers": {
    "useEffectiveDefaultReviewers": true,
    "includeAuthorAsReviewer": true,
    "extraUsernames": []
  }
}
```

Override path: `BITBUCKET_MCP_CONFIG=/path/to/config.json`

### 2. Credentials

Atlassian API token with repository read/write. Set via **one** of:

| Method | Variables |
| ------ | --------- |
| `mcp.json` env (recommended) | `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` |
| Shell profile | same vars in `~/.zshrc` / `~/.bashrc` |

Create token: Atlassian → Account settings → Security → Create and manage API tokens.

### 3. Cursor MCP

Merge into `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "node",
      "args": ["/absolute/path/to/bitbucket-mcp/dist/index.js"],
      "env": {
        "BITBUCKET_USERNAME": "you@example.com",
        "BITBUCKET_APP_PASSWORD": "your-token"
      }
    }
  }
}
```

Restart Cursor. MCP panel should show **bitbucket** green.

### 4. Approval watch hook (optional)

```bash
npm link
```

Merge `examples/hooks.json` into `~/.cursor/hooks.json`. Requires `bitbucket-mcp-watch-hook` on PATH.

## Agent skill

Copy to your project so agents auto-load PR workflow:

```bash
cp -r skills/bitbucket-pr /path/to/your-repo/.cursor/skills/
```

Or install globally: `~/.cursor/skills/bitbucket-pr/`

## MCP tools

| Tool | Description |
| ---- | ----------- |
| `create_pull_request` | Create PR |
| `list_pull_requests` | List PRs (filter by source/state) |
| `get_pull_request_approvals` | Approval count + approvers |
| `start_pr_approval_watch` | Start periodic approval check |
| `schedule_pr_approval_recheck` | Defer next check |
| `clear_pr_approval_watch` | Stop watch |

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `BITBUCKET_USERNAME` | Atlassian account email |
| `BITBUCKET_APP_PASSWORD` | API token |
| `BITBUCKET_TOKEN` | Alias for app password |
| `BITBUCKET_MCP_CONFIG` | Custom config file path |
| `BITBUCKET_MCP_WATCH_FILE` | Custom watch state path |

## Development

```bash
npm run build
npm run typecheck
node dist/index.js   # stdio MCP — Cursor launches this
```

## Security

- Credentials never stored in repo or MCP config files committed to git
- API calls scoped to configured repository + `/user` + `/users/` endpoints
- Prefer `mcp.json` env over shell profile for token isolation

## License

MIT
