# bitbucket-mcp

Cursor MCP server for **Bitbucket Cloud** — PR create/list, review comments, approval checks, and lifecycle watch via Cursor stop hook.

## Install

Add to `~/.cursor/mcp.json` and restart Cursor:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "args": ["-y", "@zhrgns/bitbucket-mcp"],
      "env": {
        "BITBUCKET_USERNAME": "you@example.com",
        "BITBUCKET_TOKEN": "your-api-token",
        "BITBUCKET_WORKSPACE": "your-workspace",
        "BITBUCKET_REPO_SLUG": "your-repo"
      }
    }
  }
}
```

Full snippet: [`templates/mcp.json`](templates/mcp.json).

Not on npm yet? Replace args with:

```json
"args": ["-y", "github:zhrgns/bitbucket-mcp"]
```

**Local clone** (repo checkout): build once, then point Cursor at `dist/index.js`:

```bash
cd /path/to/bitbucket-mcp && yarn && yarn build
```

```json
"command": "node",
"args": ["/path/to/bitbucket-mcp/dist/index.js"]
```

If MCP shows `Connection closed`, `dist/index.js` is missing — run `yarn build` again.

API token: Atlassian account → Security → API tokens (repository read/write).

> Credentials and repo identity live in `mcp.json` env. Never commit them.

### Optional: reviewer config file

Default reviewers work out of the box. For extra usernames, add `~/.config/bitbucket-mcp/config.json` — [`templates/config.json`](templates/config.json).

### Optional: stop hook

Merge [`templates/hooks.json`](templates/hooks.json) into `~/.cursor/hooks.json` for automated PR watch loops.

### Skills (download)

Ready-made agent skills — copy into your project or `~/.cursor/skills/`:

| Skill | Use case |
| ----- | -------- |
| [`bitbucket-pr`](skills/bitbucket-pr/SKILL.md) | Open PR |
| [`bitbucket-pr-review`](skills/bitbucket-pr-review/SKILL.md) | Fix & resolve review comments |
| [`bitbucket-babysit`](skills/bitbucket-babysit/SKILL.md) | Full lifecycle until merge-ready |

```bash
cp -r skills/bitbucket-babysit ~/.cursor/skills/
# or per project: cp -r skills/bitbucket-pr .cursor/skills/
```

From GitHub without clone: [skills/](https://github.com/zhrgns/bitbucket-mcp/tree/main/skills).

## MCP tools

| Tool                           | Description                         |
| ------------------------------ | ----------------------------------- |
| `create_pull_request`          | Create PR with auto reviewers       |
| `get_effective_default_reviewers` | List repo default reviewers      |
| `list_pull_requests`           | Filter by `source`, `state`         |
| `get_pull_request`             | PR details + state                  |
| `get_pull_request_approvals`   | Approval count + approvers          |
| `get_pull_request_comments`    | Unresolved comment threads          |
| `resolve_pull_request_comment` | Resolve thread after fix            |
| `start_pr_approval_watch`      | Approval-only polling               |
| `start_pr_review_watch`        | Review-comment polling              |
| `start_pr_babysit_watch`       | Review + approval until merge-ready |
| `schedule_pr_approval_recheck` | Defer next hook tick                |
| `clear_pr_approval_watch`      | Stop any active watch               |

## Environment variables

| Variable                   | Required | Purpose                 |
| -------------------------- | -------- | ----------------------- |
| `BITBUCKET_USERNAME`       | yes      | Atlassian email         |
| `BITBUCKET_TOKEN`          | yes      | API token               |
| `BITBUCKET_WORKSPACE`      | yes\*    | Workspace slug          |
| `BITBUCKET_REPO_SLUG`      | yes\*    | Repository slug         |
| `BITBUCKET_MCP_CONFIG`     | no       | Custom config path      |
| `BITBUCKET_MCP_WATCH_FILE` | no       | Custom watch state path |
| `BITBUCKET_MCP_READ_ZSHRC` | no       | `1` to load creds from `~/.zshrc` (off by default) |

\*Or config file `repository.workspace` / `repository.slug`.

## Security

- Credentials in `mcp.json` env only (not committed)
- `~/.zshrc` fallback off by default — enable in `mcp.json` if you keep creds in shell profile:

```json
"env": {
  "BITBUCKET_MCP_READ_ZSHRC": "1",
  "BITBUCKET_USERNAME": "...",
  "BITBUCKET_TOKEN": "..."
}
```

Requires `BITBUCKET_USERNAME` and `BITBUCKET_TOKEN` (or `BITBUCKET_APP_PASSWORD`) in `~/.zshrc`. Prefer `mcp.json` env when possible.

- Local config/watch files written with `0600` permissions
- API calls scoped to configured repository + `/user` + `/users/`

## License

MIT
