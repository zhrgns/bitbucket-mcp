import { z } from 'zod';
const positiveInt = z.coerce
    .number()
    .int()
    .positive()
    .describe('Pull request id');
const prState = z
    .enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'])
    .describe('PR state filter (default OPEN)');
const lifecycleWatchBase = {
    prId: positiveInt,
    prUrl: z.string().min(1).describe('Pull request web URL'),
    sourceBranch: z.string().min(1).describe('Feature branch name'),
    intervalMinutes: z.coerce
        .number()
        .int()
        .positive()
        .optional()
        .describe('Polling interval in minutes (default 10)'),
    jiraTransitionName: z
        .string()
        .optional()
        .describe('Jira transition name when approved'),
};
export const createPullRequestSchema = {
    source: z.string().min(1).describe('Source branch name'),
    destination: z.string().min(1).describe('Destination branch name'),
    title: z.string().min(1).describe('PR title'),
    description: z.string().optional().describe('PR description (markdown)'),
    closeSourceBranch: z
        .boolean()
        .optional()
        .describe('Close source branch after merge'),
};
export const listPullRequestsSchema = {
    source: z.string().optional().describe('Filter by source branch name'),
    state: prState.optional(),
};
export const getPullRequestSchema = {
    prId: positiveInt,
};
export const getPullRequestApprovalsSchema = {
    prId: positiveInt.optional(),
    source: z
        .string()
        .optional()
        .describe('Source branch — finds first open PR (prId or source required)'),
};
export const getPullRequestCommentsSchema = {
    prId: positiveInt,
    unresolvedOnly: z
        .boolean()
        .optional()
        .describe('Return only unresolved threads (default true)'),
};
export const resolvePullRequestCommentSchema = {
    prId: positiveInt,
    commentId: z.coerce
        .number()
        .int()
        .positive()
        .describe('Thread root comment id'),
};
export const startPrApprovalWatchSchema = {
    ...lifecycleWatchBase,
    jiraKey: z.string().min(1).describe('Jira issue key'),
};
export const startPrReviewWatchSchema = {
    ...lifecycleWatchBase,
};
export const startPrBabysitWatchSchema = {
    ...lifecycleWatchBase,
    jiraKey: z.string().min(1).describe('Jira issue key'),
};
export const emptyToolSchema = z.object({});
