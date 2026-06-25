import { getRepoApiPrefix, loadCredentials } from './config.js';
const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';
const getAuthHeader = () => {
    const { username, token } = loadCredentials();
    return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
};
const assertAllowedApiUrl = (url, config) => {
    const repoPrefix = getRepoApiPrefix(config);
    const allowed = [
        `${BITBUCKET_API_BASE}/user`,
        `${BITBUCKET_API_BASE}/users/`,
        repoPrefix,
    ];
    if (!allowed.some(prefix => url.startsWith(prefix))) {
        throw new Error(`Request blocked: URL not allowed (${url})`);
    }
};
const bitbucketRequest = async (url, config, options = {}) => {
    assertAllowedApiUrl(url, config);
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: getAuthHeader(),
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
    });
    const text = await response.text();
    let data = { raw: text };
    if (text) {
        try {
            data = JSON.parse(text);
        }
        catch {
            data = { raw: text };
        }
    }
    if (!response.ok) {
        const errorData = data;
        const message = errorData?.error?.message ||
            errorData?.message ||
            errorData?.raw ||
            response.statusText;
        throw new Error(`Bitbucket API ${response.status}: ${message}`);
    }
    return data;
};
const fetchAllPages = async (initialUrl, config) => {
    const users = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
        const page = await bitbucketRequest(nextUrl, config);
        users.push(...(page.values ?? []));
        nextUrl = page.next;
    }
    return users;
};
const fetchUserByUsername = async (username, config) => {
    try {
        return await bitbucketRequest(`${BITBUCKET_API_BASE}/users/${encodeURIComponent(username)}`, config);
    }
    catch {
        return null;
    }
};
export const resolveReviewers = async (config) => {
    const byUuid = new Map();
    const addUser = (user) => {
        if (!user?.uuid) {
            return;
        }
        byUuid.set(user.uuid, {
            uuid: user.uuid,
            display_name: user.display_name ?? user.nickname,
        });
    };
    if (config.reviewers.useEffectiveDefaultReviewers) {
        const defaults = await fetchAllPages(`${getRepoApiPrefix(config)}/effective-default-reviewers`, config);
        defaults.forEach(addUser);
    }
    if (config.reviewers.includeAuthorAsReviewer) {
        const author = await bitbucketRequest(`${BITBUCKET_API_BASE}/user`, config);
        addUser(author);
    }
    for (const username of config.reviewers.extraUsernames) {
        addUser(await fetchUserByUsername(username, config));
    }
    return [...byUuid.values()];
};
export const createPullRequest = async (config, payload) => {
    const reviewers = await resolveReviewers(config);
    return bitbucketRequest(`${getRepoApiPrefix(config)}/pullrequests`, config, {
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
    let q = `state="${query.state}"`;
    if (query.source) {
        q += ` AND source.branch.name="${query.source}"`;
    }
    return bitbucketRequest(`${getRepoApiPrefix(config)}/pullrequests?q=${encodeURIComponent(q)}`, config);
};
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
export const getPullRequestById = async (config, prId) => bitbucketRequest(`${getRepoApiPrefix(config)}/pullrequests/${prId}`, config);
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
