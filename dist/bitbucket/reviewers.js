import { getRepoApiPrefix } from '../config/paths.js';
import { BITBUCKET_API_BASE, bitbucketRequest } from './api-client.js';
const extractReviewerUser = (entry) => {
    const nested = entry.user ?? entry.reviewer;
    if (nested?.uuid) {
        return nested;
    }
    if (entry.uuid) {
        return {
            uuid: entry.uuid,
            display_name: entry.display_name,
            nickname: entry.nickname,
            account_id: entry.account_id,
        };
    }
    return null;
};
const fetchEffectiveDefaultReviewers = async (initialUrl, config) => {
    const entries = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
        const page = await bitbucketRequest(nextUrl, config);
        entries.push(...(page.values ?? []));
        nextUrl = page.next;
    }
    return entries;
};
export const getEffectiveDefaultReviewers = async (config) => {
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    const author = await bitbucketRequest(`${BITBUCKET_API_BASE}/user`, config);
    const entries = await fetchEffectiveDefaultReviewers(`${repoPrefix}/effective-default-reviewers?pagelen=50`, config);
    return entries.flatMap((entry) => {
        const user = extractReviewerUser(entry);
        if (!user?.uuid) {
            return [];
        }
        const authorMatch = isSameUser(user, author);
        return [
            {
                uuid: user.uuid,
                display_name: user.display_name ?? user.nickname,
                nickname: user.nickname,
                account_id: user.account_id,
                reviewer_type: entry.reviewer_type,
                isAuthor: authorMatch,
                includedOnPrCreate: !authorMatch,
            },
        ];
    });
};
const fetchUserByUsername = async (username, config) => {
    try {
        return await bitbucketRequest(`${BITBUCKET_API_BASE}/users/${encodeURIComponent(username)}`, config);
    }
    catch {
        return null;
    }
};
const normalizeUuid = (uuid) => (uuid ?? '').replace(/[{}]/g, '').toLowerCase();
const isSameUser = (a, b) => {
    const aUuid = normalizeUuid(a.uuid);
    const bUuid = normalizeUuid(b.uuid);
    if (aUuid && bUuid && aUuid === bUuid) {
        return true;
    }
    return !!a.account_id && a.account_id === b.account_id;
};
export const resolveReviewers = async (config) => {
    const byUuid = new Map();
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    const author = await bitbucketRequest(`${BITBUCKET_API_BASE}/user`, config);
    const addUser = (user) => {
        if (!user?.uuid || isSameUser(user, author)) {
            return;
        }
        const key = normalizeUuid(user.uuid);
        byUuid.set(key, {
            uuid: user.uuid,
            display_name: user.display_name ?? user.nickname,
        });
    };
    if (config.reviewers.useEffectiveDefaultReviewers) {
        const defaults = await fetchEffectiveDefaultReviewers(`${repoPrefix}/effective-default-reviewers`, config);
        for (const entry of defaults) {
            addUser(extractReviewerUser(entry));
        }
    }
    for (const username of config.reviewers.extraUsernames) {
        addUser(await fetchUserByUsername(username, config));
    }
    return [...byUuid.values()];
};
