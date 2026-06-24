import type { McpConfig } from '../types/config.js';
import type { BitbucketUser, PaginatedUsers } from '../types/bitbucket.js';
import { getRepoApiPrefix } from '../config/paths.js';
import { BITBUCKET_API_BASE, bitbucketRequest } from './api-client.js';

const fetchAllPages = async (
  initialUrl: string,
  config: McpConfig
): Promise<BitbucketUser[]> => {
  const users: BitbucketUser[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    const page: PaginatedUsers = await bitbucketRequest<PaginatedUsers>(
      nextUrl,
      config
    );
    users.push(...(page.values ?? []));
    nextUrl = page.next;
  }

  return users;
};

const fetchUserByUsername = async (
  username: string,
  config: McpConfig
): Promise<BitbucketUser | null> => {
  try {
    return await bitbucketRequest<BitbucketUser>(
      `${BITBUCKET_API_BASE}/users/${encodeURIComponent(username)}`,
      config
    );
  } catch {
    return null;
  }
};

const normalizeUuid = (uuid: string): string =>
  uuid.replace(/[{}]/g, '').toLowerCase();

const isSameUser = (a: BitbucketUser, b: BitbucketUser): boolean => {
  if (normalizeUuid(a.uuid) === normalizeUuid(b.uuid)) {
    return true;
  }
  return !!a.account_id && a.account_id === b.account_id;
};

export const resolveReviewers = async (
  config: McpConfig
): Promise<{ uuid: string; display_name?: string }[]> => {
  const byUuid = new Map<string, { uuid: string; display_name?: string }>();
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const author = await bitbucketRequest<BitbucketUser>(
    `${BITBUCKET_API_BASE}/user`,
    config
  );

  const addUser = (user?: BitbucketUser | null): void => {
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
    const defaults = await fetchAllPages(
      `${repoPrefix}/effective-default-reviewers`,
      config
    );
    defaults.forEach(addUser);
  }

  for (const username of config.reviewers.extraUsernames) {
    addUser(await fetchUserByUsername(username, config));
  }

  return [...byUuid.values()];
};
