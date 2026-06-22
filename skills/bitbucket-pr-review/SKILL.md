---
name: bitbucket-pr-review
description: >-
  Triage and fix Bitbucket PR review comments via bitbucket-mcp until the PR is
  merged or declined. Use when addressing PR feedback, resolving comment threads,
  or running review watch with the stop hook.
---

# Bitbucket PR Review (MCP)

Use **bitbucket-mcp** tools only — never `curl` or shell API calls.

## Prerequisites

- `bitbucket-mcp` green in Cursor MCP panel
- `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG`, credentials in `mcp.json` env
- Optional: stop hook from `templates/hooks.json`

## One-shot review (manual)

### 1. Locate PR

`list_pull_requests` (`source`, `state: OPEN`) or known `prId`.

### 2. Fetch unresolved comments

`get_pull_request_comments`:

| Field | Value |
| ----- | ----- |
| `prId` | PR id |
| `unresolvedOnly` | `true` (default) |

If `unresolvedCount === 0` → review queue is clear.

### 3. Fix each thread

For each item in `unresolved`:

1. Open `path` / `line` when inline; otherwise read `content`
2. Apply fix — match project style
3. Push only when user asks
4. `resolve_pull_request_comment` with thread root `commentId`

### 4. Verify

Re-run `get_pull_request_comments` until `unresolvedCount === 0`.

## Automated review watch

1. `get_pull_request` — skip if `MERGED` / `DECLINED` / `SUPERSEDED`
2. `start_pr_review_watch` with `prId`, `prUrl`, `sourceBranch`, `intervalMinutes: 10`
3. On hook follow-up — fix + resolve loop
4. Terminal PR state → `clear_pr_approval_watch`

## Tools

| Tool | Purpose |
| ---- | ------- |
| `get_pull_request` | PR state |
| `get_pull_request_comments` | Unresolved threads |
| `resolve_pull_request_comment` | Close thread after fix |
| `start_pr_review_watch` | Start polling |
| `schedule_pr_approval_recheck` | Defer next tick |
| `clear_pr_approval_watch` | Stop watch |

## Pitfalls

| Issue | Fix |
| ----- | --- |
| Resolve fails | Fix pushed; use thread root `commentId` |
| Hook silent | Merge `templates/hooks.json` into `~/.cursor/hooks.json` |
