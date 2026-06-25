import fs from 'node:fs';
import { getConfigDir, writePrivateFile } from '../config/paths.js';
const getWatchPath = () => process.env.BITBUCKET_MCP_WATCH_FILE?.trim() ||
    `${getConfigDir()}/pr-watch.json`;
const DEFAULT_TRANSITION = 'Development Completed';
const buildWatch = (mode, input) => {
    const intervalMinutes = input.intervalMinutes ?? 10;
    const now = Date.now();
    return {
        active: true,
        mode,
        prId: input.prId,
        prUrl: input.prUrl,
        sourceBranch: input.sourceBranch,
        intervalMinutes,
        nextCheckAt: now + intervalMinutes * 60_000,
        startedAt: now,
        jiraKey: input.jiraKey?.trim().toUpperCase() || undefined,
        jiraTransitionName: input.jiraTransitionName?.trim() || DEFAULT_TRANSITION,
    };
};
export const loadWatch = () => {
    const watchPath = getWatchPath();
    if (!fs.existsSync(watchPath)) {
        return null;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
        if (!raw.active || typeof raw.prId !== 'number') {
            return null;
        }
        const mode = raw.mode ?? 'approval';
        const needsJira = mode === 'approval' || mode === 'babysit';
        if (needsJira && !raw.jiraKey) {
            return null;
        }
        return {
            active: true,
            mode,
            prId: raw.prId,
            prUrl: raw.prUrl ?? '',
            sourceBranch: raw.sourceBranch ?? '',
            intervalMinutes: raw.intervalMinutes ?? 10,
            nextCheckAt: raw.nextCheckAt ?? Date.now(),
            startedAt: raw.startedAt ?? Date.now(),
            jiraKey: raw.jiraKey,
            jiraTransitionName: raw.jiraTransitionName ?? DEFAULT_TRANSITION,
        };
    }
    catch {
        return null;
    }
};
export const saveWatch = (watch) => {
    writePrivateFile(getWatchPath(), JSON.stringify(watch, null, 2));
};
export const startLifecycleWatch = (mode, input) => {
    if ((mode === 'approval' || mode === 'babysit') && !input.jiraKey?.trim()) {
        throw new Error(`jiraKey is required for ${mode} watch`);
    }
    const watch = buildWatch(mode, input);
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
