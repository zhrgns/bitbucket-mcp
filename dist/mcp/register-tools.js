import { getPullRequestComments, resolvePullRequestComment } from '../bitbucket/comments.js';
import { createPullRequest, getPullRequestApprovals, getPullRequestById, listPullRequests } from '../bitbucket/pull-requests.js';
import { getEffectiveDefaultReviewers } from '../bitbucket/reviewers.js';
import { loadConfig } from '../config/load.js';
import { clearWatch, loadWatch, scheduleNextCheck, startLifecycleWatch } from '../watch/store.js';
import { parseCreatePullRequest, parseGetApprovals, parseGetComments, parseListPullRequests, parsePrId, parseResolveComment, parseStartLifecycleWatch, parseToolArgs } from './parsers.js';
import { jsonResult } from './result.js';
import { createPullRequestSchema, emptyToolSchema, getPullRequestApprovalsSchema, getPullRequestCommentsSchema, getPullRequestSchema, listPullRequestsSchema, resolvePullRequestCommentSchema, startPrApprovalWatchSchema, startPrBabysitWatchSchema, startPrReviewWatchSchema } from './schemas.js';
export const registerTools = (server) => {
    server.registerTool('create_pull_request', {
        description: 'Create a Bitbucket Cloud pull request for the configured repository. Reviewers: effective default reviewers (author excluded) + optional extraUsernames from config.',
        inputSchema: createPullRequestSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const input = parseCreatePullRequest(parseToolArgs(rawArgs));
        const pr = await createPullRequest(config, input);
        const url = pr.links?.html?.href ?? '';
        return jsonResult({
            id: pr.id,
            title: pr.title,
            state: pr.state,
            url,
            source: input.source,
            destination: input.destination,
            reviewers: (pr.reviewers ?? []).map((r) => ({
                uuid: r.uuid,
                display_name: r.display_name ?? r.nickname
            }))
        });
    });
    server.registerTool('list_pull_requests', {
        description: 'List pull requests for the configured repository. Use to detect duplicate open PRs before create.',
        inputSchema: listPullRequestsSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const input = parseListPullRequests(parseToolArgs(rawArgs));
        const data = await listPullRequests(config, input);
        const items = (data.values ?? []).map((pr) => ({
            id: pr.id,
            title: pr.title,
            state: pr.state,
            url: pr.links?.html?.href,
            source: pr.source?.branch?.name,
            destination: pr.destination?.branch?.name
        }));
        return jsonResult(items);
    });
    server.registerTool('get_effective_default_reviewers', {
        description: 'List Bitbucket effective default reviewers for the configured repository. Shows which reviewers are applied on create_pull_request (author is excluded).',
        inputSchema: emptyToolSchema
    }, async () => {
        const config = loadConfig();
        const reviewers = await getEffectiveDefaultReviewers(config);
        return jsonResult({
            count: reviewers.length,
            includedOnPrCreateCount: reviewers.filter((r) => r.includedOnPrCreate)
                .length,
            reviewers
        });
    });
    server.registerTool('get_pull_request', {
        description: 'Get pull request details by prId. Use to check state (OPEN/MERGED) during review watch.',
        inputSchema: getPullRequestSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const { prId } = parsePrId(parseToolArgs(rawArgs));
        const pr = await getPullRequestById(config, prId);
        return jsonResult({
            id: pr.id,
            title: pr.title,
            state: pr.state,
            url: pr.links?.html?.href,
            source: pr.source?.branch?.name,
            destination: pr.destination?.branch?.name
        });
    });
    server.registerTool('get_pull_request_approvals', {
        description: 'Get approval count and approvers. Provide prId or source (one required).',
        inputSchema: getPullRequestApprovalsSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const input = parseGetApprovals(parseToolArgs(rawArgs));
        const status = await getPullRequestApprovals(config, input);
        return jsonResult(status);
    });
    server.registerTool('get_pull_request_comments', {
        description: 'List PR comment threads. Returns unresolvedCount and thread roots with path/line for inline comments.',
        inputSchema: getPullRequestCommentsSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const input = parseGetComments(parseToolArgs(rawArgs));
        const summary = await getPullRequestComments(config, input.prId, input.unresolvedOnly);
        return jsonResult(summary);
    });
    server.registerTool('resolve_pull_request_comment', {
        description: 'Resolve a PR comment thread after the fix is pushed.',
        inputSchema: resolvePullRequestCommentSchema
    }, async (rawArgs) => {
        const config = loadConfig();
        const input = parseResolveComment(parseToolArgs(rawArgs));
        const result = await resolvePullRequestComment(config, input.prId, input.commentId);
        return jsonResult(result);
    });
    server.registerTool('start_pr_approval_watch', {
        description: 'Start approval-only polling (default 10 min). Requires stop hook.',
        inputSchema: startPrApprovalWatchSchema
    }, async (rawArgs) => {
        const input = parseStartLifecycleWatch(parseToolArgs(rawArgs));
        if (!input.jiraKey) {
            throw new Error('jiraKey is required for approval watch');
        }
        const watch = startLifecycleWatch('approval', input);
        return jsonResult(watchPayload(watch));
    });
    server.registerTool('start_pr_review_watch', {
        description: 'Start review-comment polling until PR is merged/declined.',
        inputSchema: startPrReviewWatchSchema
    }, async (rawArgs) => {
        const input = parseStartLifecycleWatch(parseToolArgs(rawArgs));
        const watch = startLifecycleWatch('review', input);
        return jsonResult(watchPayload(watch));
    });
    server.registerTool('start_pr_babysit_watch', {
        description: 'Start combined review + approval watch until merge-ready.',
        inputSchema: startPrBabysitWatchSchema
    }, async (rawArgs) => {
        const input = parseStartLifecycleWatch(parseToolArgs(rawArgs));
        if (!input.jiraKey) {
            throw new Error('jiraKey is required for babysit watch');
        }
        const watch = startLifecycleWatch('babysit', input);
        return jsonResult(watchPayload(watch));
    });
    server.registerTool('schedule_pr_approval_recheck', {
        description: 'Defer the next lifecycle watch check by one interval.',
        inputSchema: emptyToolSchema
    }, async () => {
        const watch = loadWatch();
        if (!watch) {
            throw new Error('No active PR watch');
        }
        const updated = scheduleNextCheck(watch);
        return jsonResult({
            active: updated.active,
            mode: updated.mode,
            prId: updated.prId,
            nextCheckAt: new Date(updated.nextCheckAt).toISOString(),
            intervalMinutes: updated.intervalMinutes
        });
    });
    server.registerTool('clear_pr_approval_watch', {
        description: 'Stop any active PR lifecycle watch (approval, review, or babysit).',
        inputSchema: emptyToolSchema
    }, async () => {
        clearWatch();
        return jsonResult({ active: false });
    });
};
const watchPayload = (watch) => ({
    active: watch.active,
    mode: watch.mode,
    prId: watch.prId,
    prUrl: watch.prUrl,
    intervalMinutes: watch.intervalMinutes,
    jiraKey: watch.jiraKey,
    jiraTransitionName: watch.jiraTransitionName,
    message: `Watch started (${watch.mode}). Stop hook re-prompts each interval.`
});
