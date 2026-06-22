/**
 * Configuration and auth types for bitbucket-mcp.
 *
 * Repository identity: `BITBUCKET_WORKSPACE` + `BITBUCKET_REPO_SLUG` in mcp.json env
 * (recommended), or `~/.config/bitbucket-mcp/config.json`.
 * Reviewer rules optional in config file only. Credentials are env-only.
 */

/** Rules for resolving PR reviewers when `create_pull_request` runs. */
export type ReviewerConfig = {
  /** Include Bitbucket effective-default-reviewers for the configured repo. */
  useEffectiveDefaultReviewers: boolean;
  /** Add the authenticated API user as a reviewer (common for self-approval flows). */
  includeAuthorAsReviewer: boolean;
  /** Extra Bitbucket usernames to resolve and attach as reviewers. */
  extraUsernames: string[];
};

/**
 * Resolved MCP configuration. Repository from env or config file;
 * reviewer overrides from config file when present.
 */
export type McpConfig = {
  repository: {
    /** Bitbucket workspace slug (e.g. `acme-corp`). */
    workspace: string;
    /** Repository slug within the workspace (e.g. `mobile-app`). */
    slug: string;
  };
  reviewers: ReviewerConfig;
};

/** Basic auth credentials for Bitbucket Cloud REST API 2.0. */
export type Credentials = {
  /** Atlassian account email (`BITBUCKET_USERNAME`). */
  username: string;
  /** API token (`BITBUCKET_APP_PASSWORD` or `BITBUCKET_TOKEN`). */
  token: string;
};
