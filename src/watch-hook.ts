#!/usr/bin/env node
import { loadWatch } from './pr-watch.js';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const main = async (): Promise<void> => {
  const watch = loadWatch();
  if (!watch) {
    return;
  }

  const waitMs = Math.max(0, watch.nextCheckAt - Date.now());
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  const followupMessage = [
    'PR approval watch (automatic):',
    `Check approval status for PR #${watch.prId} (${watch.jiraKey}).`,
    '',
    'Steps:',
    '1. bitbucket-mcp `get_pull_request_approvals` — prId or source branch',
    '2. If approvalCount >= 1:',
    `   - Jira MCP: transition ${watch.jiraKey} to "${watch.jiraTransitionName}"`,
    '   - bitbucket-mcp `clear_pr_approval_watch`',
    `   - Notify user: approved, Jira updated, PR: ${watch.prUrl}`,
    '3. If no approval:',
    '   - bitbucket-mcp `schedule_pr_approval_recheck`',
    '   - Notify user briefly: no approval yet, next check in ~10 min',
    '',
    'Do not use shell/curl for Bitbucket. Stop watch only after approval.',
  ].join('\n');

  process.stdout.write(
    JSON.stringify({
      followup_message: followupMessage,
    })
  );
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
