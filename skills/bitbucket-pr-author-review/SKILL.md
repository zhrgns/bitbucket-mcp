---
name: bitbucket-pr-author-review
description: >-
  Perform Bitbucket PR code review via bitbucket-mcp — fetch diff, post inline
  or PR-level comments, approve or request changes. Use when reviewing someone
  else's PR, running parallel review agents, or drafting review feedback.
---

# Bitbucket PR Author Review (MCP)

Use **bitbucket-mcp** tools only — never `curl` or shell API calls.

## Prerequisites

- `bitbucket-mcp` green in Cursor MCP panel
- `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG`, credentials in `mcp.json` env

## Review workflow

### 1. Locate PR

`list_pull_requests` (`source`, `state: OPEN`) or known `prId`.

### 2. Guard against duplicate review

`get_pull_request_activity` with `prId`:

| Field | Action |
| ----- | ------ |
| `reviewAlreadyPostedForCommit` | If `true`, stop — already reviewed this commit |
| `sourceCommitHash` | Current HEAD on the PR branch |

### 3. Fetch diff

`get_pull_request_diff`:

| Field | Value |
| ----- | ----- |
| `prId` | PR id |
| `path` | optional — single file |
| `maxChars` | optional — default 120000 |

Check `changedFiles` first — if unexpected paths, stop and use local `git diff origin/<destination>...HEAD`.

**Fallback when MCP tools are unavailable:** use local `git diff origin/<destination>...HEAD` (three-dot) to produce a **draft review only**. Do **not** post to Bitbucket without the MCP tools.

### 4. Check CI

`get_pull_request_build_status` with `prId`:

| Field | Rule |
| ----- | ---- |
| `hasFailed` | Do **not** call `approve_pull_request` |
| `hasInProgress` | Wait or note in review — do not approve yet |
| `allPassed` | Safe to approve when code looks good |

### 5. Post feedback

`add_pull_request_comment`:

| Type | Fields |
| ---- | ------ |
| PR-level summary | `prId`, `content` |
| Inline | `prId`, `content`, `path`, `line` (+ optional `toLine`) |

Draft locally first when unsure; post only when review is final.

### 6. Verdict

| Outcome | Tool |
| ------- | ---- |
| LGTM, CI green | `approve_pull_request` |
| Issues found | `request_pull_request_changes` + inline comments |

Never approve when `get_pull_request_build_status.hasFailed === true`.

## Tools

| Tool | Purpose |
| ---- | ------- |
| `get_pull_request` | PR state |
| `get_pull_request_diff` | Unified diff |
| `get_pull_request_activity` | Spam guard + history |
| `get_pull_request_build_status` | CI gate before approve |
| `add_pull_request_comment` | Inline or PR-level comment |
| `approve_pull_request` | Approve |
| `request_pull_request_changes` | Request changes |

## Pitfalls

| Issue | Fix |
| ----- | --- |
| Duplicate AI review on same push | Check `reviewAlreadyPostedForCommit` first |
| Approve with red CI | Always call `get_pull_request_build_status` before approve |
| No MCP / offline | Local `git diff` draft only — never post |
