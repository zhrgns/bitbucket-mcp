/**
 * PR lifecycle watch — persisted state for the Cursor stop hook loop.
 *
 * Written to `~/.config/bitbucket-mcp/pr-watch.json` (or `BITBUCKET_MCP_WATCH_FILE`).
 * Modes: approval (wait for approve), review (fix comments), babysit (both until merge).
 */

/** What the stop hook should check on each interval. */
export type WatchMode = 'approval' | 'review' | 'babysit';

/** Serialized watch state on disk. Timestamps are Unix ms (`Date.now()`). */
export type PrLifecycleWatch = {
  active: boolean;
  mode: WatchMode;
  prId: number;
  prUrl: string;
  sourceBranch: string;
  intervalMinutes: number;
  nextCheckAt: number;
  startedAt: number;
  /** Required for `approval` and `babysit` when Jira transition is used. */
  jiraKey?: string;
  jiraTransitionName?: string;
};

/** Shared fields for starting any watch mode. */
export type StartLifecycleWatchInput = {
  prId: number;
  prUrl: string;
  sourceBranch: string;
  intervalMinutes?: number;
  jiraKey?: string;
  jiraTransitionName?: string;
};
