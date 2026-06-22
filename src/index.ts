#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createPullRequest,
  getPullRequestApprovals,
  listPullRequests,
} from './bitbucket-client.js';
import { loadConfig } from './config.js';
import {
  clearWatch,
  loadWatch,
  scheduleNextCheck,
  startWatch,
} from './pr-watch.js';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(
  readFileSync(join(packageRoot, '../package.json'), 'utf8')
) as { version: string };

const PR_STATES = new Set(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']);

type CreatePullRequestInput = {
  source: string;
  destination: string;
  title: string;
  description: string;
  closeSourceBranch: boolean;
};

type ListPullRequestsInput = {
  source?: string;
  state: string;
};

type GetApprovalsInput = {
  prId?: number;
  source?: string;
};

type StartWatchInput = {
  prId: number;
  jiraKey: string;
  prUrl: string;
  sourceBranch: string;
  intervalMinutes?: number;
  jiraTransitionName?: string;
};

const requireNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
};

const requirePositiveInt = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
};

const parseCreatePullRequest = (args: Record<string, unknown>): CreatePullRequestInput => ({
  source: requireNonEmptyString(args.source, 'source'),
  destination: requireNonEmptyString(args.destination, 'destination'),
  title: requireNonEmptyString(args.title, 'title'),
  description: typeof args.description === 'string' ? args.description : '',
  closeSourceBranch: args.closeSourceBranch === true,
});

const parseListPullRequests = (args: Record<string, unknown>): ListPullRequestsInput => {
  const state = typeof args.state === 'string' ? args.state : 'OPEN';
  if (!PR_STATES.has(state)) {
    throw new Error(`state must be one of: ${[...PR_STATES].join(', ')}`);
  }

  const source =
    args.source === undefined
      ? undefined
      : requireNonEmptyString(args.source, 'source');

  return { source, state };
};

const parseGetApprovals = (args: Record<string, unknown>): GetApprovalsInput => {
  const prId =
    args.prId === undefined ? undefined : requirePositiveInt(args.prId, 'prId');
  const source =
    args.source === undefined
      ? undefined
      : requireNonEmptyString(args.source, 'source');

  if (prId === undefined && source === undefined) {
    throw new Error('prId or source is required');
  }

  return { prId, source };
};

const parseStartWatch = (args: Record<string, unknown>): StartWatchInput => ({
  prId: requirePositiveInt(args.prId, 'prId'),
  jiraKey: requireNonEmptyString(args.jiraKey, 'jiraKey'),
  prUrl: requireNonEmptyString(args.prUrl, 'prUrl'),
  sourceBranch: requireNonEmptyString(args.sourceBranch, 'sourceBranch'),
  intervalMinutes:
    args.intervalMinutes === undefined
      ? undefined
      : requirePositiveInt(args.intervalMinutes, 'intervalMinutes'),
  jiraTransitionName:
    typeof args.jiraTransitionName === 'string'
      ? args.jiraTransitionName.trim()
      : undefined,
});

const parseToolArgs = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const jsonResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const server = new McpServer({
  name: 'bitbucket-mcp',
  version,
});

server.registerTool(
  'create_pull_request',
  {
    description:
      'Create a Bitbucket Cloud pull request for the configured repository. Args: source, destination, title, description?, closeSourceBranch?. Reviewers: effective default reviewers + authenticated author + optional extraUsernames from config.',
  },
  async (rawArgs?: unknown) => {
    const config = loadConfig();
    const input = parseCreatePullRequest(parseToolArgs(rawArgs));

    const pr = await createPullRequest(config, input);
    const url = pr.links?.html?.href ?? '';

    return jsonResult({
      id: pr.id,
      title: pr.title,
      state: pr.state,
      url,
      source: input.source,
      destination: input.destination,
      reviewers: (pr.reviewers ?? []).map(r => ({
        uuid: r.uuid,
        display_name: r.display_name ?? r.nickname,
      })),
    });
  }
);

server.registerTool(
  'list_pull_requests',
  {
    description:
      'List pull requests for the configured repository. Args: source?, state? (OPEN|MERGED|DECLINED|SUPERSEDED, default OPEN). Use to detect duplicate open PRs before create.',
  },
  async (rawArgs?: unknown) => {
    const config = loadConfig();
    const input = parseListPullRequests(parseToolArgs(rawArgs));
    const data = await listPullRequests(config, input);

    const items = (data.values ?? []).map(pr => ({
      id: pr.id,
      title: pr.title,
      state: pr.state,
      url: pr.links?.html?.href,
      source: pr.source?.branch?.name,
      destination: pr.destination?.branch?.name,
    }));

    return jsonResult(items);
  }
);

server.registerTool(
  'get_pull_request_approvals',
  {
    description:
      'Get approval count and approvers. Args: prId? or source? (one required). Source finds first open PR for that branch.',
  },
  async (rawArgs?: unknown) => {
    const config = loadConfig();
    const input = parseGetApprovals(parseToolArgs(rawArgs));
    const status = await getPullRequestApprovals(config, input);
    return jsonResult(status);
  }
);

server.registerTool(
  'start_pr_approval_watch',
  {
    description:
      'Start PR approval polling (default 10 min). Args: prId, jiraKey, prUrl, sourceBranch, intervalMinutes?, jiraTransitionName?. Requires bitbucket-mcp-watch-hook in ~/.cursor/hooks.json.',
  },
  async (rawArgs?: unknown) => {
    const input = parseStartWatch(parseToolArgs(rawArgs));
    const watch = startWatch(input);
    return jsonResult({
      active: watch.active,
      prId: watch.prId,
      jiraKey: watch.jiraKey,
      prUrl: watch.prUrl,
      intervalMinutes: watch.intervalMinutes,
      jiraTransitionName: watch.jiraTransitionName,
      message:
        'Watch started. stop hook re-prompts the agent each interval until approval.',
    });
  }
);

server.registerTool(
  'schedule_pr_approval_recheck',
  {
    description:
      'Defer the next approval check by one interval when approval is not yet received. Call from hook follow-up flow.',
  },
  async () => {
    const watch = loadWatch();
    if (!watch) {
      throw new Error('No active PR approval watch');
    }
    const updated = scheduleNextCheck(watch);
    return jsonResult({
      active: updated.active,
      prId: updated.prId,
      nextCheckAt: new Date(updated.nextCheckAt).toISOString(),
      intervalMinutes: updated.intervalMinutes,
    });
  }
);

server.registerTool(
  'clear_pr_approval_watch',
  {
    description:
      'Stop PR approval watch after approval is confirmed and any follow-up (e.g. Jira transition) is done.',
  },
  async () => {
    clearWatch();
    return jsonResult({ active: false });
  }
);

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} catch (error) {
  console.error(error);
  process.exit(1);
}
