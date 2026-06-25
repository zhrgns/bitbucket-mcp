import { getRepoApiPrefix } from '../config/paths.js';
import { bitbucketRequest } from './api-client.js';
import { resolveReviewers } from './reviewers.js';
const escapeBitbucketQueryValue = (value) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const mapApprovalStatus = (pr) => {
    const approvers = (pr.participants ?? [])
        .filter(p => p.approved === true || p.state === 'approved')
        .map(p => ({
        displayName: p.user?.display_name ?? p.user?.nickname ?? 'Unknown',
        nickname: p.user?.nickname,
    }));
    return {
        id: pr.id,
        title: pr.title,
        state: pr.state,
        url: pr.links?.html?.href ?? '',
        sourceBranch: pr.source?.branch?.name,
        approvalCount: approvers.length,
        approvers,
    };
};
export const createPullRequest = async (config, payload) => {
    const reviewers = await resolveReviewers(config);
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    return bitbucketRequest(`${repoPrefix}/pullrequests`, config, {
        method: 'POST',
        body: JSON.stringify({
            title: payload.title,
            description: payload.description,
            source: { branch: { name: payload.source } },
            destination: { branch: { name: payload.destination } },
            close_source_branch: payload.closeSourceBranch,
            reviewers: reviewers.map(r => ({ uuid: r.uuid })),
        }),
    });
};
export const listPullRequests = async (config, query) => {
    let q = `state="${escapeBitbucketQueryValue(query.state)}"`;
    if (query.source) {
        q += ` AND source.branch.name="${escapeBitbucketQueryValue(query.source)}"`;
    }
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    return bitbucketRequest(`${repoPrefix}/pullrequests?q=${encodeURIComponent(q)}`, config);
};
export const getPullRequestById = async (config, prId) => {
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    return bitbucketRequest(`${repoPrefix}/pullrequests/${prId}`, config);
};
export const getPullRequestApprovals = async (config, query) => {
    if (query.prId !== undefined) {
        const pr = await getPullRequestById(config, query.prId);
        return mapApprovalStatus(pr);
    }
    if (query.source) {
        const list = await listPullRequests(config, {
            source: query.source,
            state: 'OPEN',
        });
        const pr = list.values?.[0];
        if (!pr) {
            throw new Error(`No open PR found for source branch: ${query.source}`);
        }
        const full = await getPullRequestById(config, pr.id);
        return mapApprovalStatus(full);
    }
    throw new Error('prId or source is required');
};
