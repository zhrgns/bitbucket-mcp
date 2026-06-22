---
name: bitbucket-pr
description: >-
  Open and track Bitbucket Cloud pull requests via bitbucket-mcp. Use when
  creating PRs, checking approvals, or running PR approval watch with Jira.
---

# Bitbucket PR (MCP)

Use **bitbucket-mcp** tools only for Bitbucket API — never `curl` or shell API calls.

## Prerequisites

- `bitbucket-mcp` installed and green in Cursor MCP panel
- `~/.config/bitbucket-mcp/config.json` with `repository.workspace` and `repository.slug`
- Credentials: `BITBUCKET_USERNAME` + `BITBUCKET_APP_PASSWORD` (env or `mcp.json` env block)
- Optional: `bitbucket-mcp-watch-hook` in `~/.cursor/hooks.json` for approval polling

## Open PR workflow

### 1. Branches

- **Source:** current git branch (must be pushed — inform user if not; do not push unless asked)
- **Destination:** parent branch the feature was created from — not necessarily `main`/`dev`

Verify shared history with git before creating.

### 2. Duplicate check

`list_pull_requests`:

| Field | Value |
| ----- | ----- |
| `source` | current branch |
| `state` | `OPEN` |

If open PR exists → reuse it; skip create.

### 3. Create PR

`create_pull_request`:

| Field | Value |
| ----- | ----- |
| `source` | current branch |
| `destination` | parent branch |
| `title` | `{IssueKey}: {summary}` |
| `description` | Summary + test plan (markdown) |
| `closeSourceBranch` | `false` |

Reviewers resolve automatically from Bitbucket effective defaults + author + `extraUsernames` in config.

### 4. Approval watch (optional)

Requires stop hook. Pair with Jira/Atlassian MCP.

1. `get_pull_request_approvals` — if `approvalCount >= 1`, skip watch
2. `start_pr_approval_watch` with `prId`, `prUrl`, `sourceBranch`, `jiraKey`, `intervalMinutes: 10`
3. On hook follow-up:
   - Approved → Jira transition → `clear_pr_approval_watch`
   - Not approved → `schedule_pr_approval_recheck`

## Tools reference

| Tool | Purpose |
| ---- | ------- |
| `create_pull_request` | Create PR with auto reviewers |
| `list_pull_requests` | List/filter PRs |
| `get_pull_request_approvals` | Approval count + approvers |
| `start_pr_approval_watch` | Start polling |
| `schedule_pr_approval_recheck` | Defer next check |
| `clear_pr_approval_watch` | Stop polling |

## Pitfalls

| Issue | Fix |
| ----- | --- |
| MCP red | Check config path, credentials, `npm run build` |
| Hook not firing | Merge `examples/hooks.json` into `~/.cursor/hooks.json`, `npm link` for watch hook bin |
| Wrong destination | Use parent branch, not default integration branch |
