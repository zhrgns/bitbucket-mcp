import type { McpConfig } from '../types/config.js';
import { loadCredentials } from '../config/auth.js';
import { getRepoApiPrefix } from '../config/paths.js';

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';

const getAuthHeader = (): string => {
  const { username, token } = loadCredentials();
  return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
};

const isAllowedApiUrl = (url: string, config: McpConfig): boolean => {
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  if (url === `${BITBUCKET_API_BASE}/user`) {
    return true;
  }

  if (url.startsWith(`${BITBUCKET_API_BASE}/users/`)) {
    return true;
  }

  return url === repoPrefix || url.startsWith(`${repoPrefix}/`);
};

const assertAllowedApiUrl = (url: string, config: McpConfig): void => {
  if (!isAllowedApiUrl(url, config)) {
    throw new Error(`Request blocked: URL not allowed (${url})`);
  }
};

const buildHeaders = (
  options: RequestInit,
  accept: string
): Record<string, string> => ({
  Authorization: getAuthHeader(),
  Accept: accept,
  ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  ...(options.headers as Record<string, string> | undefined),
});

const parseErrorMessage = (
  text: string,
  statusText: string
): string => {
  if (!text) {
    return statusText;
  }
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string };
      message?: string;
    };
    return data?.error?.message || data?.message || text;
  } catch {
    return text;
  }
};

export const bitbucketRequest = async <T>(
  url: string,
  config: McpConfig,
  options: RequestInit = {}
): Promise<T> => {
  assertAllowedApiUrl(url, config);

  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options, 'application/json'),
  });

  const text = await response.text();
  let data: T | { raw: string } = { raw: text } as { raw: string };

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const errorData = data as {
      error?: { message?: string };
      message?: string;
      raw?: string;
    };
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      errorData?.raw ||
      response.statusText;
    throw new Error(`Bitbucket API ${response.status}: ${message}`);
  }

  return data as T;
};

export const bitbucketTextRequest = async (
  url: string,
  config: McpConfig,
  options: RequestInit = {}
): Promise<string> => {
  assertAllowedApiUrl(url, config);

  const response = await fetch(url, {
    ...options,
    redirect: 'follow',
    headers: buildHeaders(options, 'text/plain'),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Bitbucket API ${response.status}: ${parseErrorMessage(text, response.statusText)}`
    );
  }

  return text;
};

export const getCurrentUser = async (
  config: McpConfig
): Promise<{ uuid: string; displayName: string; nickname?: string }> => {
  const user = await bitbucketRequest<{
    uuid: string;
    display_name?: string;
    nickname?: string;
  }>(`${BITBUCKET_API_BASE}/user`, config);

  return {
    uuid: user.uuid,
    displayName: user.display_name ?? user.nickname ?? 'Unknown',
    nickname: user.nickname,
  };
};

export { BITBUCKET_API_BASE };
