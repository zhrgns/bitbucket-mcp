---
name: bitbucket-pr
description: >-
  Open and track Bitbucket Cloud pull requests via bitbucket-mcp. Use when
  creating PRs, checking approvals, or running PR approval watch with Jira.
---

# Bitbucket PR (MCP)

Use **bitbucket-mcp** tools only for Bitbucket API — never `curl` or shell API calls.

## Prerequisites

- `bitbucket-mcp` green in Cursor MCP panel (`mcp.json` — see repo README)
- `BITBUCKET_WORKSPACE` + `BITBUCKET_REPO_SLUG` in `mcp.json` env
- `BITBUCKET_USERNAME` + `BITBUCKET_TOKEN` in `mcp.json` env
- Optional: stop hook from `templates/hooks.json` for approval polling

## Open PR workflow

### 1. Branches

- **Source:** current git branch (must be pushed — inform user if not; do not push unless asked)
- **Destination:** parent branch the feature was created from — not necessarily `main`/`dev`

Verify shared history with git before creating.

### 2. Duplicate check

`list_pull_requests`:

| Field    | Value          |
| -------- | -------------- |
| `source` | current branch |
| `state`  | `OPEN`         |

If open PR exists → reuse it; skip create.

### 3. Create PR

`create_pull_request`:

| Field               | Value                          |
| ------------------- | ------------------------------ |
| `source`            | current branch                 |
| `destination`       | parent branch                  |
| `title`             | `{IssueKey}: {summary}`        |
| `description`       | Summary + test plan (markdown) |
| `closeSourceBranch` | `true`                         |

Reviewers resolve from Bitbucket effective defaults (author excluded) + optional config extras.

Before `create_pull_request`, use `get_effective_default_reviewers` if reviewer setup needs inspection.

### 4. Approval watch (optional)

Requires stop hook. Pair with Jira/Atlassian MCP. For full lifecycle use **bitbucket-babysit**.

1. `get_pull_request_approvals` — if `approvalCount >= 1`, skip watch
2. `start_pr_approval_watch` with `prId`, `prUrl`, `sourceBranch`, `jiraKey`, `intervalMinutes: 10`
3. On hook follow-up:
   - Approved → Jira transition → `clear_pr_approval_watch`
   - Not approved → `schedule_pr_approval_recheck`

## Related skills

| Skill                 | When                                            |
| --------------------- | ----------------------------------------------- |
| `bitbucket-pr-review` | Fix review comments only                        |
| `bitbucket-babysit`   | Open PR + comments + approval until merge-ready |

## Tools

| Tool                              | Purpose                       |
| --------------------------------- | ----------------------------- |
| `create_pull_request`             | Create PR with auto reviewers |
| `get_effective_default_reviewers` | List repo default reviewers   |
| `list_pull_requests`              | List/filter PRs               |
| `get_pull_request_approvals`      | Approval count + approvers    |
| `start_pr_approval_watch`         | Start polling                 |
| `schedule_pr_approval_recheck`    | Defer next check              |
| `clear_pr_approval_watch`         | Stop polling                  |

## Pitfalls

| Issue               | Fix                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------- |
| MCP red             | Check `mcp.json` env vars                                                           |
| Author reviewer 400 | `get_effective_default_reviewers` — author has `isAuthor: true`, excluded on create |
| Hook not firing     | Merge `templates/hooks.json` into `~/.cursor/hooks.json`                            |
| Wrong destination   | Use parent branch, not default integration branch                                   |
