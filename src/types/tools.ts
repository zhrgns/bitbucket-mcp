/**
 * Validated MCP tool inputs — parsed from raw JSON args in `src/mcp/parsers.ts`.
 *
 * Kept separate from Bitbucket API types: these reflect agent-facing tool contracts,
 * not REST request/response bodies.
 */

/** Input for `create_pull_request`. */
export type CreatePullRequestInput = {
  source: string;
  destination: string;
  title: string;
  description: string;
  closeSourceBranch: boolean;
};

/** Input for `list_pull_requests`. */
export type ListPullRequestsInput = {
  source?: string;
  /** Defaults to `OPEN` when omitted in the parser. */
  state: string;
};

/** Input for `get_pull_request_approvals` — exactly one of prId or source required. */
export type GetApprovalsInput = {
  prId?: number;
  source?: string;
};

/** Input for `get_pull_request` / comment tools. */
export type PrIdInput = {
  prId: number;
};

/** Input for `resolve_pull_request_comment`. */
export type ResolveCommentInput = {
  prId: number;
  commentId: number;
};

/** Input for `get_pull_request_comments`. */
export type GetCommentsInput = {
  prId: number;
  unresolvedOnly?: boolean;
};

/** Input for `get_pull_request_diff`. */
export type GetPullRequestDiffInput = {
  prId: number;
  path?: string;
  maxChars?: number;
};

/** Input for `add_pull_request_comment`. */
export type AddPullRequestCommentInput = {
  prId: number;
  content: string;
  path?: string;
  line?: number;
  toLine?: number;
};

/** Input for `get_pull_request_activity`. */
export type GetPullRequestActivityInput = {
  prId: number;
  limit?: number;
};
