import { loadCredentials } from '../config/auth.js';
import { getRepoApiPrefix } from '../config/paths.js';
const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';
const getAuthHeader = () => {
    const { username, token } = loadCredentials();
    return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
};
const isAllowedApiUrl = (url, config) => {
    const repoPrefix = getRepoApiPrefix(config.repository.workspace, config.repository.slug);
    if (url === `${BITBUCKET_API_BASE}/user`) {
        return true;
    }
    if (url.startsWith(`${BITBUCKET_API_BASE}/users/`)) {
        return true;
    }
    return url === repoPrefix || url.startsWith(`${repoPrefix}/`);
};
const assertAllowedApiUrl = (url, config) => {
    if (!isAllowedApiUrl(url, config)) {
        throw new Error(`Request blocked: URL not allowed (${url})`);
    }
};
const buildHeaders = (options, accept) => ({
    Authorization: getAuthHeader(),
    Accept: accept,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
});
const parseErrorMessage = (text, statusText) => {
    if (!text) {
        return statusText;
    }
    try {
        const data = JSON.parse(text);
        return data?.error?.message || data?.message || text;
    }
    catch {
        return text;
    }
};
export const bitbucketRequest = async (url, config, options = {}) => {
    assertAllowedApiUrl(url, config);
    const response = await fetch(url, {
        ...options,
        headers: buildHeaders(options, 'application/json'),
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
export const bitbucketTextRequest = async (url, config, options = {}) => {
    assertAllowedApiUrl(url, config);
    const response = await fetch(url, {
        ...options,
        redirect: 'follow',
        headers: buildHeaders(options, 'text/plain'),
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Bitbucket API ${response.status}: ${parseErrorMessage(text, response.statusText)}`);
    }
    return text;
};
export const getCurrentUser = async (config) => {
    const user = await bitbucketRequest(`${BITBUCKET_API_BASE}/user`, config);
    return {
        uuid: user.uuid,
        displayName: user.display_name ?? user.nickname ?? 'Unknown',
        nickname: user.nickname,
    };
};
export { BITBUCKET_API_BASE };
