import { getRepoApiPrefix } from '../config/paths.js';
import { bitbucketRequest } from './api-client.js';
import { getPullRequestById } from './pull-requests.js';
const fetchAllComments = async (initialUrl, config) => {
    const comments = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
        const page = await bitbucketRequest(nextUrl, config);
        comments.push(...(page.values ?? []));
        nextUrl = page.next;
    }
    return comments;
};
const isThreadRoot = (comment) => !comment.deleted && (comment.parent?.id === undefined || comment.parent === null);
const isUnresolvedThread = (root, all) => {
    if (root.resolution !== undefined && root.resolution !== null) {
        return false;
    }
    const replies = all.filter((c) => c.parent?.id === root.id);
    return !replies.some((r) => r.resolution !== undefined && r.resolution !== null);
};
const mapThread = (comment) => ({
    commentId: comment.id,
    author: comment.user?.display_name ?? comment.user?.nickname ?? 'Unknown',
    content: comment.content?.raw?.trim() ?? '',
    path: comment.inline?.path,
    line: comment.inline?.from,
    createdOn: comment.created_on,
});
export const getPullRequestComments = async (config, prId, unresolvedOnly = true) => {
    const pr = await getPullRequestById(config, prId);
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    const all = await fetchAllComments(`${repoPrefix}/pullrequests/${prId}/comments?pagelen=100`, config);
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
export const resolvePullRequestComment = async (config, prId, commentId) => {
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    await bitbucketRequest(`${repoPrefix}/pullrequests/${prId}/comments/${commentId}/resolve`, config, { method: 'POST' });
    return { prId, commentId, resolved: true };
};
