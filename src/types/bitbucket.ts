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

/** Commit ref on a pull request branch. */
export type BitbucketCommitRef = {
  hash?: string;
};

/** Branch endpoint on a pull request. */
export type BitbucketBranchRef = {
  branch?: { name?: string };
  commit?: BitbucketCommitRef;
};

/** Pull request resource returned by Bitbucket API. */
export type BitbucketPullRequest = {
  id: number;
  title: string;
  /** `OPEN` | `MERGED` | `DECLINED` | `SUPERSEDED` */
  state: string;
  links?: { html?: { href?: string } };
  source?: BitbucketBranchRef;
  destination?: BitbucketBranchRef;
  reviewers?: BitbucketUser[];
  participants?: BitbucketParticipant[];
  updated_on?: string;
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

/** Entry from `GET .../effective-default-reviewers`. */
export type BitbucketDefaultReviewerEntry = {
  user?: BitbucketUser;
  reviewer?: BitbucketUser;
  reviewer_type?: string;
  type?: string;
  uuid?: string;
  display_name?: string;
  nickname?: string;
  account_id?: string;
};

/** Paginated list wrapper for user collections (e.g. default reviewers). */
export type PaginatedUsers = {
  values?: BitbucketUser[];
  next?: string;
};

/** Paginated effective default reviewers. */
export type PaginatedDefaultReviewers = {
  values?: BitbucketDefaultReviewerEntry[];
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

/** Body fields for `POST .../pullrequests/{id}/comments`. */
export type AddPullRequestCommentPayload = {
  content: string;
  path?: string;
  line?: number;
  toLine?: number;
};

/** Normalized build/commit status on a pull request. */
export type PullRequestBuildStatus = {
  key: string;
  name: string;
  state: string;
  description?: string;
  url?: string;
  refname?: string;
  createdOn?: string;
  updatedOn?: string;
};

/** Summary returned by `get_pull_request_build_status`. */
export type PullRequestBuildStatusSummary = {
  prId: number;
  sourceCommitHash?: string;
  allPassed: boolean;
  hasFailed: boolean;
  hasInProgress: boolean;
  statuses: PullRequestBuildStatus[];
};

/** Normalized PR activity entry. */
export type PullRequestActivityEntry = {
  type: 'comment' | 'approval' | 'changes_requested' | 'update' | 'other';
  date?: string;
  author?: string;
  authorUuid?: string;
  content?: string;
  commentId?: number;
  path?: string;
  line?: number;
  sourceCommitHash?: string;
};

/** Summary returned by `get_pull_request_activity`. */
export type PullRequestActivitySummary = {
  prId: number;
  sourceCommitHash?: string;
  destinationCommitHash?: string;
  currentUserUuid?: string;
  commentsOnCurrentCommit: number;
  currentUserCommentsOnCurrentCommit: number;
  reviewAlreadyPostedForCommit: boolean;
  entries: PullRequestActivityEntry[];
};

/** Diff summary returned by `get_pull_request_diff`. */
export type PullRequestDiffSummary = {
  prId: number;
  sourceCommitHash: string;
  destinationCommitHash: string;
  path?: string;
  diff: string;
  truncated: boolean;
  charCount: number;
};

/** Participant response from approve / request-changes. */
export type PullRequestParticipantAction = {
  prId: number;
  state: string;
  approved: boolean;
  participatedOn?: string;
};

export type BitbucketCommitStatusList = {
  values?: {
    key?: string;
    name?: string;
    state?: string;
    description?: string;
    url?: string;
    refname?: string;
    created_on?: string;
    updated_on?: string;
  }[];
  next?: string;
};

export type BitbucketActivityList = {
  values?: BitbucketActivityItem[];
  next?: string;
};

export type BitbucketActivityItem = {
  comment?: BitbucketComment & {
    pullrequest?: { id?: number };
  };
  approval?: {
    date?: string;
    user?: BitbucketUser;
  };
  changes_requested?: {
    date?: string;
    user?: BitbucketUser;
  };
  update?: {
    date?: string;
    source?: BitbucketBranchRef;
    destination?: BitbucketBranchRef;
    author?: BitbucketUser;
  };
};
