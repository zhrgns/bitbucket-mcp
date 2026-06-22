#!/usr/bin/env node
import type { PrLifecycleWatch } from '../types/watch.js';
import { loadWatch } from '../watch/store.js';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const approvalSteps = (watch: PrLifecycleWatch): string[] => [
  '1. `get_pull_request_approvals` — prId or source branch',
  '2. If approvalCount >= 1:',
  ...(watch.jiraKey
    ? [
        `   - Jira MCP: transition ${watch.jiraKey} to "${watch.jiraTransitionName}"`,
      ]
    : []),
  '   - `clear_pr_approval_watch`',
  `   - Notify user: approved, PR: ${watch.prUrl}`,
  '3. If no approval:',
  '   - `schedule_pr_approval_recheck`',
  '   - Notify briefly: no approval yet',
];

const reviewSteps = (watch: PrLifecycleWatch): string[] => [
  `1. \`get_pull_request\` prId ${watch.prId} — if state is MERGED/DECLINED/SUPERSEDED:`,
  '   - `clear_pr_approval_watch`, notify user PR is done',
  '2. `get_pull_request_comments` — prId, unresolvedOnly true',
  '3. For each unresolved thread:',
  '   - Read inline path/line, apply fix in codebase',
  '   - Push only if user asked or branch not on remote',
  '   - `resolve_pull_request_comment` with thread root commentId',
  '4. If no unresolved comments:',
  '   - `schedule_pr_approval_recheck`',
  '   - Notify briefly: no open review threads',
];

const babysitSteps = (watch: PrLifecycleWatch): string[] => [
  `1. \`get_pull_request\` prId ${watch.prId} — if terminal state, clear watch and notify`,
  '2. `get_pull_request_comments` — fix and resolve all unresolved threads (same as review skill)',
  '3. `get_pull_request_approvals` — when approvalCount >= 1 AND unresolvedCount is 0:',
  ...(watch.jiraKey
    ? [
        `   - Jira MCP: transition ${watch.jiraKey} to "${watch.jiraTransitionName}"`,
      ]
    : []),
  '   - `clear_pr_approval_watch`, notify user PR is merge-ready',
  '4. Otherwise `schedule_pr_approval_recheck`',
];

const buildFollowup = (watch: PrLifecycleWatch): string => {
  const header = `PR ${watch.mode} watch (automatic) — PR #${watch.prId}`;
  const steps =
    watch.mode === 'approval'
      ? approvalSteps(watch)
      : watch.mode === 'review'
        ? reviewSteps(watch)
        : babysitSteps(watch);

  return [
    header,
    watch.jiraKey ? `Jira: ${watch.jiraKey}` : '',
    '',
    'Steps:',
    ...steps,
    '',
    'Use bitbucket-mcp tools only — no shell/curl for Bitbucket.',
    'Do not clear watch until exit conditions above are met.',
  ]
    .filter((line) => line !== '')
    .join('\n');
};

const main = async (): Promise<void> => {
  const watch = loadWatch();
  if (!watch) {
    return;
  }

  const waitMs = Math.max(0, watch.nextCheckAt - Date.now());
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  process.stdout.write(
    JSON.stringify({
      followup_message: buildFollowup(watch),
    })
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
