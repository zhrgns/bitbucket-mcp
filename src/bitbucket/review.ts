import type { McpConfig } from '../types/config.js';
import type {
  BitbucketActivityItem,
  BitbucketActivityList,
  BitbucketCommitStatusList,
  BitbucketDiffstatList,
  PullRequestActivityEntry,
  PullRequestActivitySummary,
  PullRequestBuildStatus,
  PullRequestBuildStatusSummary,
  PullRequestDiffSummary,
  PullRequestParticipantAction,
} from '../types/bitbucket.js';
import type { GetPullRequestDiffInput } from '../types/tools.js';
import { getRepoApiPrefix } from '../config/paths.js';
import {
  bitbucketRequest,
  bitbucketTextRequest,
  getCurrentUser,
} from './api-client.js';
import { getPullRequestById } from './pull-requests.js';

const DEFAULT_DIFF_MAX_CHARS = 120_000;
const FAILED_BUILD_STATES = new Set(['FAILED', 'STOPPED']);
const IN_PROGRESS_BUILD_STATES = new Set(['INPROGRESS', 'PENDING']);

const fetchAllPages = async <T extends { next?: string; values?: unknown[] }>(
  initialUrl: string,
  config: McpConfig,
  maxItems?: number
): Promise<unknown[]> => {
  const items: unknown[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    const page: T = await bitbucketRequest<T>(nextUrl, config);
    items.push(...(page.values ?? []));
    if (maxItems !== undefined && items.length >= maxItems) {
      return items.slice(0, maxItems);
    }
    nextUrl = page.next;
  }

  return items;
};

const buildPrDiffUrl = (
  repoPrefix: string,
  prId: number,
  path?: string
): string => {
  const params = new URLSearchParams({ topic: 'true' });
  if (path) {
    params.set('path', path);
  }
  return `${repoPrefix}/pullrequests/${prId}/diff?${params.toString()}`;
};

const extractDiffstatPath = (
  entry: NonNullable<BitbucketDiffstatList['values']>[number]
): string | undefined => entry.new?.path ?? entry.old?.path;

const getPullRequestChangedFiles = async (
  config: McpConfig,
  repoPrefix: string,
  prId: number
): Promise<string[]> => {
  const rawEntries = await fetchAllPages<BitbucketDiffstatList>(
    `${repoPrefix}/pullrequests/${prId}/diffstat?topic=true&pagelen=100`,
    config
  );

  return rawEntries
    .map((item) =>
      extractDiffstatPath(
        item as NonNullable<BitbucketDiffstatList['values']>[number]
      )
    )
    .filter((path): path is string => Boolean(path));
};

export const getPullRequestDiff = async (
  config: McpConfig,
  input: GetPullRequestDiffInput
): Promise<PullRequestDiffSummary> => {
  const pr = await getPullRequestById(config, input.prId);
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const [changedFiles, rawDiff] = await Promise.all([
    getPullRequestChangedFiles(config, repoPrefix, input.prId),
    bitbucketTextRequest(
      buildPrDiffUrl(repoPrefix, input.prId, input.path),
      config
    ),
  ]);

  const maxChars = input.maxChars ?? DEFAULT_DIFF_MAX_CHARS;
  const truncated = rawDiff.length > maxChars;
  const diff = truncated ? rawDiff.slice(0, maxChars) : rawDiff;

  return {
    prId: input.prId,
    sourceCommitHash: pr.source?.commit?.hash,
    destinationCommitHash: pr.destination?.commit?.hash,
    sourceBranch: pr.source?.branch?.name,
    destinationBranch: pr.destination?.branch?.name,
    changedFiles,
    path: input.path,
    diff,
    truncated,
    charCount: diff.length,
  };
};

export const approvePullRequest = async (
  config: McpConfig,
  prId: number
): Promise<PullRequestParticipantAction> => {
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const participant = await bitbucketRequest<{
    state?: string;
    approved?: boolean;
    participated_on?: string;
  }>(`${repoPrefix}/pullrequests/${prId}/approve`, config, { method: 'POST' });

  return {
    prId,
    state: participant.state ?? 'approved',
    approved: participant.approved === true,
    participatedOn: participant.participated_on,
  };
};

export const requestPullRequestChanges = async (
  config: McpConfig,
  prId: number
): Promise<PullRequestParticipantAction> => {
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const participant = await bitbucketRequest<{
    state?: string;
    approved?: boolean;
    participated_on?: string;
  }>(
    `${repoPrefix}/pullrequests/${prId}/request-changes`,
    config,
    { method: 'POST' }
  );

  return {
    prId,
    state: participant.state ?? 'changes_requested',
    approved: participant.approved === true,
    participatedOn: participant.participated_on,
  };
};

const mapBuildStatus = (
  status: NonNullable<BitbucketCommitStatusList['values']>[number]
): PullRequestBuildStatus => ({
  key: status.key ?? '',
  name: status.name ?? status.key ?? '',
  state: status.state ?? 'UNKNOWN',
  description: status.description,
  url: status.url,
  refname: status.refname,
  createdOn: status.created_on,
  updatedOn: status.updated_on,
});

export const getPullRequestBuildStatus = async (
  config: McpConfig,
  prId: number
): Promise<PullRequestBuildStatusSummary> => {
  const pr = await getPullRequestById(config, prId);
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const rawStatuses = await fetchAllPages<BitbucketCommitStatusList>(
    `${repoPrefix}/pullrequests/${prId}/statuses?pagelen=100`,
    config
  );

  const statuses = rawStatuses.map((item) =>
    mapBuildStatus(item as NonNullable<BitbucketCommitStatusList['values']>[number])
  );

  const hasFailed = statuses.some((s) => FAILED_BUILD_STATES.has(s.state));
  const hasInProgress = statuses.some((s) =>
    IN_PROGRESS_BUILD_STATES.has(s.state)
  );
  const allPassed =
    statuses.length > 0 &&
    statuses.every((s) => s.state === 'SUCCESSFUL') &&
    !hasFailed &&
    !hasInProgress;

  return {
    prId,
    sourceCommitHash: pr.source?.commit?.hash,
    allPassed,
    hasFailed,
    hasInProgress,
    statuses,
  };
};

const mapActivityItem = (item: BitbucketActivityItem): PullRequestActivityEntry => {
  if (item.comment) {
    return {
      type: 'comment',
      date: item.comment.created_on,
      author:
        item.comment.user?.display_name ??
        item.comment.user?.nickname ??
        undefined,
      authorUuid: item.comment.user?.uuid,
      content: item.comment.content?.raw?.trim(),
      commentId: item.comment.id,
      path: item.comment.inline?.path,
      line: item.comment.inline?.from,
    };
  }

  if (item.approval) {
    return {
      type: 'approval',
      date: item.approval.date,
      author:
        item.approval.user?.display_name ??
        item.approval.user?.nickname ??
        undefined,
      authorUuid: item.approval.user?.uuid,
    };
  }

  if (item.changes_requested) {
    return {
      type: 'changes_requested',
      date: item.changes_requested.date,
      author:
        item.changes_requested.user?.display_name ??
        item.changes_requested.user?.nickname ??
        undefined,
      authorUuid: item.changes_requested.user?.uuid,
    };
  }

  if (item.update) {
    return {
      type: 'update',
      date: item.update.date,
      author:
        item.update.author?.display_name ??
        item.update.author?.nickname ??
        undefined,
      authorUuid: item.update.author?.uuid,
      sourceCommitHash: item.update.source?.commit?.hash,
    };
  }

  return { type: 'other' };
};

const countCommentsSince = (
  entries: PullRequestActivityEntry[],
  since?: string,
  authorUuid?: string
): { total: number; byCurrentUser: number } => {
  const sinceMs = since ? Date.parse(since) : 0;
  let total = 0;
  let byCurrentUser = 0;

  for (const entry of entries) {
    if (entry.type !== 'comment' || !entry.date) {
      continue;
    }
    if (Date.parse(entry.date) < sinceMs) {
      continue;
    }
    total += 1;
    if (authorUuid && entry.authorUuid === authorUuid) {
      byCurrentUser += 1;
    }
  }

  return { total, byCurrentUser };
};

export const getPullRequestActivity = async (
  config: McpConfig,
  prId: number,
  limit = 50
): Promise<PullRequestActivitySummary> => {
  const pr = await getPullRequestById(config, prId);
  const sourceCommitHash = pr.source?.commit?.hash;
  const destinationCommitHash = pr.destination?.commit?.hash;
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const currentUser = await getCurrentUser(config);
  const rawItems = await fetchAllPages<BitbucketActivityList>(
    `${repoPrefix}/pullrequests/${prId}/activity?pagelen=100`,
    config,
    limit
  );

  const entries = rawItems.map((item) =>
    mapActivityItem(item as BitbucketActivityItem)
  );

  const updatesForCommit = entries.filter(
    (entry) =>
      entry.type === 'update' && entry.sourceCommitHash === sourceCommitHash
  );

  const latestUpdateForCommit = updatesForCommit.reduce<
    PullRequestActivityEntry | undefined
  >((latest, entry) => {
    if (!entry.date) {
      return latest;
    }
    if (!latest?.date || Date.parse(entry.date) > Date.parse(latest.date)) {
      return entry;
    }
    return latest;
  }, undefined);

  const commentCounts = countCommentsSince(
    entries,
    latestUpdateForCommit?.date,
    currentUser.uuid
  );

  return {
    prId,
    sourceCommitHash,
    destinationCommitHash,
    currentUserUuid: currentUser.uuid,
    commentsOnCurrentCommit: commentCounts.total,
    currentUserCommentsOnCurrentCommit: commentCounts.byCurrentUser,
    reviewAlreadyPostedForCommit: commentCounts.byCurrentUser > 0,
    entries,
  };
};
