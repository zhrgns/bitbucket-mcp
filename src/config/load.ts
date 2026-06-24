import fs from 'node:fs';
import type { McpConfig, ReviewerConfig } from '../types/config.js';
import { getConfigPath } from './paths.js';

const DEFAULT_REVIEWERS: ReviewerConfig = {
  useEffectiveDefaultReviewers: true,
  includeAuthorAsReviewer: false,
  extraUsernames: []
};

let cachedConfig: McpConfig | null = null;

const parseReviewers = (raw?: Partial<ReviewerConfig>): ReviewerConfig => {
  const rawExtraUsernames = raw?.extraUsernames;

  return {
    useEffectiveDefaultReviewers:
      raw?.useEffectiveDefaultReviewers ??
      DEFAULT_REVIEWERS.useEffectiveDefaultReviewers,
    includeAuthorAsReviewer:
      raw?.includeAuthorAsReviewer ?? DEFAULT_REVIEWERS.includeAuthorAsReviewer,
    extraUsernames: Array.isArray(rawExtraUsernames)
      ? rawExtraUsernames
          .filter((u): u is string => typeof u === 'string' && !!u.trim())
          .map((u) => u.trim())
      : []
  };
};

const loadReviewersFromFile = (): ReviewerConfig | null => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const raw = JSON.parse(
    fs.readFileSync(configPath, 'utf8')
  ) as Partial<McpConfig>;
  return parseReviewers(raw.reviewers);
};

const loadRepositoryFromEnv = (): {
  workspace: string;
  slug: string;
} | null => {
  const workspace = process.env.BITBUCKET_WORKSPACE?.trim();
  const slug = process.env.BITBUCKET_REPO_SLUG?.trim();

  if (workspace && slug) {
    return { workspace, slug };
  }

  return null;
};

const loadRepositoryFromFile = (): {
  workspace: string;
  slug: string;
} | null => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const raw = JSON.parse(
    fs.readFileSync(configPath, 'utf8')
  ) as Partial<McpConfig>;
  const workspace = raw.repository?.workspace?.trim();
  const slug = raw.repository?.slug?.trim();

  if (workspace && slug) {
    return { workspace, slug };
  }

  return null;
};

export const loadConfig = (): McpConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const repository = loadRepositoryFromEnv() ?? loadRepositoryFromFile();

  if (!repository) {
    throw new Error(
      'Set BITBUCKET_WORKSPACE and BITBUCKET_REPO_SLUG in mcp.json env, or create ~/.config/bitbucket-mcp/config.json (yarn init-config)'
    );
  }

  cachedConfig = {
    repository,
    reviewers: loadReviewersFromFile() ?? parseReviewers()
  };

  return cachedConfig;
};
