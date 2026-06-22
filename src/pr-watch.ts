import fs from 'node:fs';
import { getConfigDir } from './config.js';

export type PrApprovalWatch = {
  active: boolean;
  prId: number;
  jiraKey: string;
  prUrl: string;
  sourceBranch: string;
  intervalMinutes: number;
  nextCheckAt: number;
  startedAt: number;
  jiraTransitionName: string;
};

const getWatchPath = (): string =>
  process.env.BITBUCKET_MCP_WATCH_FILE?.trim() ||
  `${getConfigDir()}/pr-watch.json`;

const DEFAULT_TRANSITION = 'Development Completed';

export const loadWatch = (): PrApprovalWatch | null => {
  const watchPath = getWatchPath();
  if (!fs.existsSync(watchPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(watchPath, 'utf8')) as Partial<PrApprovalWatch>;
    if (!raw.active || typeof raw.prId !== 'number' || !raw.jiraKey) {
      return null;
    }
    return raw as PrApprovalWatch;
  } catch {
    return null;
  }
};

export const saveWatch = (watch: PrApprovalWatch): void => {
  const watchPath = getWatchPath();
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(watchPath, JSON.stringify(watch, null, 2));
};

export const startWatch = (input: {
  prId: number;
  jiraKey: string;
  prUrl: string;
  sourceBranch: string;
  intervalMinutes?: number;
  jiraTransitionName?: string;
}): PrApprovalWatch => {
  const intervalMinutes = input.intervalMinutes ?? 10;
  const now = Date.now();

  const watch: PrApprovalWatch = {
    active: true,
    prId: input.prId,
    jiraKey: input.jiraKey.trim().toUpperCase(),
    prUrl: input.prUrl,
    sourceBranch: input.sourceBranch,
    intervalMinutes,
    nextCheckAt: now + intervalMinutes * 60_000,
    startedAt: now,
    jiraTransitionName:
      input.jiraTransitionName?.trim() || DEFAULT_TRANSITION,
  };

  saveWatch(watch);
  return watch;
};

export const clearWatch = (): void => {
  const watchPath = getWatchPath();
  const existing = loadWatch();
  if (!existing) {
    if (fs.existsSync(watchPath)) {
      fs.unlinkSync(watchPath);
    }
    return;
  }

  saveWatch({ ...existing, active: false });
};

export const scheduleNextCheck = (watch: PrApprovalWatch): PrApprovalWatch => {
  const updated: PrApprovalWatch = {
    ...watch,
    nextCheckAt: Date.now() + watch.intervalMinutes * 60_000,
  };
  saveWatch(updated);
  return updated;
};
