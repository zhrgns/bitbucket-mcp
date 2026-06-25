import fs from 'node:fs';
import { getConfigDir } from './config.js';
const getWatchPath = () => process.env.BITBUCKET_MCP_WATCH_FILE?.trim() ||
    `${getConfigDir()}/pr-watch.json`;
const DEFAULT_TRANSITION = 'Development Completed';
export const loadWatch = () => {
    const watchPath = getWatchPath();
    if (!fs.existsSync(watchPath)) {
        return null;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
        if (!raw.active || typeof raw.prId !== 'number' || !raw.jiraKey) {
            return null;
        }
        return raw;
    }
    catch {
        return null;
    }
};
export const saveWatch = (watch) => {
    const watchPath = getWatchPath();
    fs.mkdirSync(getConfigDir(), { recursive: true });
    fs.writeFileSync(watchPath, JSON.stringify(watch, null, 2));
};
export const startWatch = (input) => {
    const intervalMinutes = input.intervalMinutes ?? 10;
    const now = Date.now();
    const watch = {
        active: true,
        prId: input.prId,
        jiraKey: input.jiraKey.trim().toUpperCase(),
        prUrl: input.prUrl,
        sourceBranch: input.sourceBranch,
        intervalMinutes,
        nextCheckAt: now + intervalMinutes * 60_000,
        startedAt: now,
        jiraTransitionName: input.jiraTransitionName?.trim() || DEFAULT_TRANSITION,
    };
    saveWatch(watch);
    return watch;
};
export const clearWatch = () => {
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
export const scheduleNextCheck = (watch) => {
    const updated = {
        ...watch,
        nextCheckAt: Date.now() + watch.intervalMinutes * 60_000,
    };
    saveWatch(updated);
    return updated;
};
