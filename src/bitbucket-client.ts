import { getRepoApiPrefix, loadCredentials, type McpConfig } from './config.js';

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';

type BitbucketUser = {
  uuid: string;
  display_name?: string;
  nickname?: string;
  account_id?: string;
};

type PaginatedUsers = {
  values?: BitbucketUser[];
  next?: string;
};

type BitbucketParticipant = {
  approved?: boolean;
  state?: string;
  user?: BitbucketUser;
};

export type BitbucketPullRequest = {
  id: number;
  title: string;
  state: string;
  links?: { html?: { href?: string } };
  source?: { branch?: { name?: string } };
  destination?: { branch?: { name?: string } };
  reviewers?: BitbucketUser[];
  participants?: BitbucketParticipant[];
};

export type PullRequestApprovalStatus = {
  id: number;
  title: string;
  state: string;
  url: string;
  sourceBranch?: string;
  approvalCount: number;
  approvers: { displayName: string; nickname?: string }[];
};

type BitbucketPullRequestList = {
  values?: BitbucketPullRequest[];
};

const getAuthHeader = (): string => {
  const { username, token } = loadCredentials();
  return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
};

const assertAllowedApiUrl = (url: string, config: McpConfig): void => {
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

const bitbucketRequest = async <T>(
  url: string,
  config: McpConfig,
  options: RequestInit = {}
): Promise<T> => {
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

export const resolveReviewers = async (
  config: McpConfig
): Promise<{ uuid: string; display_name?: string }[]> => {
  const byUuid = new Map<string, { uuid: string; display_name?: string }>();

  const addUser = (user?: BitbucketUser | null): void => {
    if (!user?.uuid) {
      return;
    }
    byUuid.set(user.uuid, {
      uuid: user.uuid,
      display_name: user.display_name ?? user.nickname,
    });
  };

  if (config.reviewers.useEffectiveDefaultReviewers) {
    const defaults = await fetchAllPages(
      `${getRepoApiPrefix(config)}/effective-default-reviewers`,
      config
    );
    defaults.forEach(addUser);
  }

  if (config.reviewers.includeAuthorAsReviewer) {
    const author = await bitbucketRequest<BitbucketUser>(
      `${BITBUCKET_API_BASE}/user`,
      config
    );
    addUser(author);
  }

  for (const username of config.reviewers.extraUsernames) {
    addUser(await fetchUserByUsername(username, config));
  }

  return [...byUuid.values()];
};

export const createPullRequest = async (
  config: McpConfig,
  payload: {
    title: string;
    description: string;
    source: string;
    destination: string;
    closeSourceBranch: boolean;
  }
): Promise<BitbucketPullRequest> => {
  const reviewers = await resolveReviewers(config);

  return bitbucketRequest<BitbucketPullRequest>(
    `${getRepoApiPrefix(config)}/pullrequests`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        source: { branch: { name: payload.source } },
        destination: { branch: { name: payload.destination } },
        close_source_branch: payload.closeSourceBranch,
        reviewers: reviewers.map(r => ({ uuid: r.uuid })),
      }),
    }
  );
};

export const listPullRequests = async (
  config: McpConfig,
  query: { source?: string; state: string }
): Promise<BitbucketPullRequestList> => {
  let q = `state="${query.state}"`;
  if (query.source) {
    q += ` AND source.branch.name="${query.source}"`;
  }

  return bitbucketRequest<BitbucketPullRequestList>(
    `${getRepoApiPrefix(config)}/pullrequests?q=${encodeURIComponent(q)}`,
    config
  );
};

const mapApprovalStatus = (pr: BitbucketPullRequest): PullRequestApprovalStatus => {
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

export const getPullRequestById = async (
  config: McpConfig,
  prId: number
): Promise<BitbucketPullRequest> =>
  bitbucketRequest<BitbucketPullRequest>(
    `${getRepoApiPrefix(config)}/pullrequests/${prId}`,
    config
  );

export const getPullRequestApprovals = async (
  config: McpConfig,
  query: { prId?: number; source?: string }
): Promise<PullRequestApprovalStatus> => {
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
