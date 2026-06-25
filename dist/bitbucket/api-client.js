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
export const bitbucketRequest = async (url, config, options = {}) => {
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
export { BITBUCKET_API_BASE };
