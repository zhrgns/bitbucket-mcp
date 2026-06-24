import type { McpConfig } from '../types/config.js';
import type {
  BitbucketDefaultReviewerEntry,
  BitbucketUser,
  PaginatedDefaultReviewers,
} from '../types/bitbucket.js';
import { getRepoApiPrefix } from '../config/paths.js';
import { BITBUCKET_API_BASE, bitbucketRequest } from './api-client.js';

const extractReviewerUser = (
  entry: BitbucketDefaultReviewerEntry
): BitbucketUser | null => {
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

const fetchEffectiveDefaultReviewers = async (
  initialUrl: string,
  config: McpConfig
): Promise<BitbucketDefaultReviewerEntry[]> => {
  const entries: BitbucketDefaultReviewerEntry[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    const page: PaginatedDefaultReviewers = await bitbucketRequest<PaginatedDefaultReviewers>(
      nextUrl,
      config
    );

    entries.push(...(page.values ?? []));
    nextUrl = page.next;
  }

  return entries;
};

export type EffectiveDefaultReviewer = {
  uuid: string;
  display_name?: string;
  nickname?: string;
  account_id?: string;
  reviewer_type?: string;
  isAuthor: boolean;
  includedOnPrCreate: boolean;
};

export const getEffectiveDefaultReviewers = async (
  config: McpConfig
): Promise<EffectiveDefaultReviewer[]> => {
  const repoPrefix = getRepoApiPrefix(
    config.repository.workspace,
    config.repository.slug
  );

  const author = await bitbucketRequest<BitbucketUser>(
    `${BITBUCKET_API_BASE}/user`,
    config
  );

  const entries = await fetchEffectiveDefaultReviewers(
    `${repoPrefix}/effective-default-reviewers?pagelen=50`,
    config
  );

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

const normalizeUuid = (uuid?: string): string =>
  (uuid ?? '').replace(/[{}]/g, '').toLowerCase();

const isSameUser = (a: BitbucketUser, b: BitbucketUser): boolean => {
  const aUuid = normalizeUuid(a.uuid);
  const bUuid = normalizeUuid(b.uuid);

  if (aUuid && bUuid && aUuid === bUuid) {
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
    const defaults = await fetchEffectiveDefaultReviewers(
      `${repoPrefix}/effective-default-reviewers`,
      config
    );
    for (const entry of defaults) {
      addUser(extractReviewerUser(entry));
    }
  }

  for (const username of config.reviewers.extraUsernames) {
    addUser(await fetchUserByUsername(username, config));
  }

  return [...byUuid.values()];
};
