/**
 * Bitbucket Cloud REST API shapes and internal query/payload types.
 *
 * Field names mirror API responses where practical (`display_name`, snake_case in
 * payloads). MCP tools return normalized shapes (e.g. `PullRequestApprovalStatus`).
 */

/** Subset of Bitbucket user object used for reviewers and participants. */
export type BitbucketUser = {
  uuid: string;
  display_name?: string;
  nickname?: string;
  account_id?: string;
};

/** PR participant entry — includes approvers and other review states. */
export type BitbucketParticipant = {
  approved?: boolean;
  state?: string;
  user?: BitbucketUser;
};

/** Pull request resource returned by Bitbucket API. */
export type BitbucketPullRequest = {
  id: number;
  title: string;
  /** `OPEN` | `MERGED` | `DECLINED` | `SUPERSEDED` */
  state: string;
  links?: { html?: { href?: string } };
  source?: { branch?: { name?: string } };
  destination?: { branch?: { name?: string } };
  reviewers?: BitbucketUser[];
  participants?: BitbucketParticipant[];
};

/** Normalized approval summary exposed by `get_pull_request_approvals`. */
export type PullRequestApprovalStatus = {
  id: number;
  title: string;
  state: string;
  url: string;
  sourceBranch?: string;
  approvalCount: number;
  approvers: { displayName: string; nickname?: string }[];
};

/** Paginated list wrapper for `GET .../pullrequests`. */
export type BitbucketPullRequestList = {
  values?: BitbucketPullRequest[];
};

/** Paginated list wrapper for user collections (e.g. default reviewers). */
export type PaginatedUsers = {
  values?: BitbucketUser[];
  next?: string;
};

/** Body fields for `POST .../pullrequests`. */
export type CreatePullRequestPayload = {
  title: string;
  description: string;
  source: string;
  destination: string;
  closeSourceBranch: boolean;
};

/** Query filters for listing pull requests. */
export type ListPullRequestsQuery = {
  source?: string;
  /** Bitbucket q-filter state, e.g. `OPEN`. */
  state: string;
};

/** Lookup by explicit PR id or first open PR on a source branch. */
export type GetApprovalsQuery = {
  prId?: number;
  source?: string;
};

/** Bitbucket PR comment (subset of API response). */
export type BitbucketComment = {
  id: number;
  content?: { raw?: string };
  user?: BitbucketUser;
  created_on?: string;
  parent?: { id?: number } | null;
  inline?: { path?: string; from?: number; to?: number };
  deleted?: boolean;
  /** Present when the thread root has been resolved. */
  resolution?: unknown;
};

export type BitbucketCommentList = {
  values?: BitbucketComment[];
  next?: string;
};

/** Normalized unresolved comment thread for agents. */
export type PullRequestCommentThread = {
  commentId: number;
  author: string;
  content: string;
  path?: string;
  line?: number;
  createdOn?: string;
};

/** Summary returned by `get_pull_request_comments`. */
export type PullRequestCommentsSummary = {
  prId: number;
  state: string;
  unresolvedCount: number;
  unresolved: PullRequestCommentThread[];
};
