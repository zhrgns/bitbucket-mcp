import type {
  CreatePullRequestInput,
  GetApprovalsInput,
  GetCommentsInput,
  ListPullRequestsInput,
  PrIdInput,
  ResolveCommentInput,
} from '../types/tools.js';
import type { StartLifecycleWatchInput } from '../types/watch.js';

const PR_STATES = new Set(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']);
const TERMINAL_PR_STATES = new Set(['MERGED', 'DECLINED', 'SUPERSEDED']);

const requireNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
};

const requirePositiveInt = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
};

export const parseToolArgs = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const parseCreatePullRequest = (
  args: Record<string, unknown>
): CreatePullRequestInput => ({
  source: requireNonEmptyString(args.source, 'source'),
  destination: requireNonEmptyString(args.destination, 'destination'),
  title: requireNonEmptyString(args.title, 'title'),
  description: typeof args.description === 'string' ? args.description : '',
  closeSourceBranch: args.closeSourceBranch === true,
});

export const parseListPullRequests = (
  args: Record<string, unknown>
): ListPullRequestsInput => {
  const state = typeof args.state === 'string' ? args.state : 'OPEN';
  if (!PR_STATES.has(state)) {
    throw new Error(`state must be one of: ${[...PR_STATES].join(', ')}`);
  }

  const source =
    args.source === undefined
      ? undefined
      : requireNonEmptyString(args.source, 'source');

  return { source, state };
};

export const parseGetApprovals = (
  args: Record<string, unknown>
): GetApprovalsInput => {
  const prId =
    args.prId === undefined ? undefined : requirePositiveInt(args.prId, 'prId');
  const source =
    args.source === undefined
      ? undefined
      : requireNonEmptyString(args.source, 'source');

  if (prId === undefined && source === undefined) {
    throw new Error('prId or source is required');
  }

  return { prId, source };
};

export const parsePrId = (args: Record<string, unknown>): PrIdInput => ({
  prId: requirePositiveInt(args.prId, 'prId'),
});

export const parseGetComments = (
  args: Record<string, unknown>
): GetCommentsInput => ({
  prId: requirePositiveInt(args.prId, 'prId'),
  unresolvedOnly: args.unresolvedOnly !== false,
});

export const parseResolveComment = (
  args: Record<string, unknown>
): ResolveCommentInput => ({
  prId: requirePositiveInt(args.prId, 'prId'),
  commentId: requirePositiveInt(args.commentId, 'commentId'),
});

export const parseStartLifecycleWatch = (
  args: Record<string, unknown>
): StartLifecycleWatchInput => ({
  prId: requirePositiveInt(args.prId, 'prId'),
  prUrl: requireNonEmptyString(args.prUrl, 'prUrl'),
  sourceBranch: requireNonEmptyString(args.sourceBranch, 'sourceBranch'),
  intervalMinutes:
    args.intervalMinutes === undefined
      ? undefined
      : requirePositiveInt(args.intervalMinutes, 'intervalMinutes'),
  jiraKey:
    typeof args.jiraKey === 'string' ? args.jiraKey.trim() : undefined,
  jiraTransitionName:
    typeof args.jiraTransitionName === 'string'
      ? args.jiraTransitionName.trim()
      : undefined,
});

export { TERMINAL_PR_STATES };
