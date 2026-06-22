---
name: bitbucket-babysit
description: >-
  Full Bitbucket PR lifecycle via bitbucket-mcp — open PR, fix review comments,
  wait for approval, Jira transition. Use for end-to-end PR babysitting until
  merge-ready.
---

# Bitbucket Babysit (MCP)

Orchestrates **bitbucket-pr** + **bitbucket-pr-review** + approval watch.

Use **bitbucket-mcp** tools only — never `curl` or shell API calls.

## Prerequisites

- `bitbucket-mcp` green in Cursor MCP panel
- `mcp.json` env: credentials, workspace, repo slug
- Stop hook from `templates/hooks.json` (required)
- Jira/Atlassian MCP for transitions

## Full lifecycle

### Phase 1 — Open PR

Follow **bitbucket-pr**: parent branch destination, duplicate check, `create_pull_request`.

### Phase 2 — Start babysit watch

`start_pr_babysit_watch`:

| Field | Value |
| ----- | ----- |
| `prId` | PR id |
| `prUrl` | PR web url |
| `sourceBranch` | feature branch |
| `jiraKey` | issue key |
| `intervalMinutes` | `10` |
| `jiraTransitionName` | optional |

### Phase 3 — Hook loop

1. `get_pull_request` — terminal state → `clear_pr_approval_watch`
2. `get_pull_request_comments` — fix + `resolve_pull_request_comment`
3. `get_pull_request_approvals` — when approved AND no unresolved comments:
   - Jira transition → `clear_pr_approval_watch`
4. Else → `schedule_pr_approval_recheck`

## Rules

- Do not push or merge unless user asks
- Do not clear watch while comments or approval remain open

## Tools

| Tool | Phase |
| ---- | ----- |
| `create_pull_request` | Open |
| `get_pull_request_comments` | Review |
| `resolve_pull_request_comment` | Review |
| `get_pull_request_approvals` | Approval |
| `start_pr_babysit_watch` | Start |
| `schedule_pr_approval_recheck` | Continue |
| `clear_pr_approval_watch` | Stop |

## Related skills

- `bitbucket-pr` — open PR only
- `bitbucket-pr-review` — comments only
