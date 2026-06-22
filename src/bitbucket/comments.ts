import type { McpConfig } from '../types/config.js';
import type {
  BitbucketComment,
  BitbucketCommentList,
  PullRequestCommentThread,
  PullRequestCommentsSummary,
} from '../types/bitbucket.js';
import { getRepoApiPrefix } from '../config/paths.js';
import { bitbucketRequest } from './api-client.js';
import { getPullRequestById } from './pull-requests.js';

const fetchAllComments = async (
  initialUrl: string,
  config: McpConfig
): Promise<BitbucketComment[]> => {
  const comments: BitbucketComment[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    const page: BitbucketCommentList = await bitbucketRequest<BitbucketCommentList>(
      nextUrl,
      config
    );
    comments.push(...(page.values ?? []));
    nextUrl = page.next;
  }

  return comments;
};

const isThreadRoot = (comment: BitbucketComment): boolean =>
  !comment.deleted && (comment.parent?.id === undefined || comment.parent === null);

const isUnresolvedThread = (
  root: BitbucketComment,
  all: BitbucketComment[]
): boolean => {
  if (root.resolution !== undefined && root.resolution !== null) {
    return false;
  }

  const replies = all.filter((c) => c.parent?.id === root.id);
  return !replies.some((r) => r.resolution !== undefined && r.resolution !== null);
};

const mapThread = (comment: BitbucketComment): PullRequestCommentThread => ({
  commentId: comment.id,
  author: comment.user?.display_name ?? comment.user?.nickname ?? 'Unknown',
  content: comment.content?.raw?.trim() ?? '',
  path: comment.inline?.path,
  line: comment.inline?.from,
  createdOn: comment.created_on,
});

export const getPullRequestComments = async (
  config: McpConfig,
  prId: number,
  unresolvedOnly = true
): Promise<PullRequestCommentsSummary> => {
  const pr = await getPullRequestById(config, prId);
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const all = await fetchAllComments(
    `${repoPrefix}/pullrequests/${prId}/comments?pagelen=100`,
    config
  );

  const roots = all.filter(isThreadRoot);
  const unresolved = roots
    .filter((root) => isUnresolvedThread(root, all))
    .map(mapThread)
    .filter((t) => t.content.length > 0);

  const threads = unresolvedOnly ? unresolved : roots.map(mapThread);

  return {
    prId,
    state: pr.state,
    unresolvedCount: unresolved.length,
    unresolved: threads,
  };
};

export const resolvePullRequestComment = async (
  config: McpConfig,
  prId: number,
  commentId: number
): Promise<{ prId: number; commentId: number; resolved: true }> => {
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  await bitbucketRequest(
    `${repoPrefix}/pullrequests/${prId}/comments/${commentId}/resolve`,
    config,
    { method: 'POST' }
  );

  return { prId, commentId, resolved: true };
};
