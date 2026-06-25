import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const CONFIG_DIR = path.join(os.homedir(), '.config/bitbucket-mcp');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_REVIEWERS = {
    useEffectiveDefaultReviewers: true,
    includeAuthorAsReviewer: true,
    extraUsernames: [],
};
let cachedConfig = null;
let cachedCredentials = null;
export const getConfigPath = () => process.env.BITBUCKET_MCP_CONFIG?.trim() || DEFAULT_CONFIG_PATH;
export const getConfigDir = () => path.dirname(getConfigPath());
const readZshrcValue = (content, key) => {
    const quoted = content.match(new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?${key}\\s*=\\s*(['"\`])(.*?)\\1`, 'm'));
    if (quoted) {
        return quoted[2].trim();
    }
    const unquoted = content.match(new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?${key}\\s*=\\s*([^\\s#]+)`, 'm'));
    return unquoted?.[1]?.trim() ?? '';
};
const loadCredentialsFromZshrc = () => {
    const zshrcPath = path.join(os.homedir(), '.zshrc');
    if (!fs.existsSync(zshrcPath)) {
        return null;
    }
    const content = fs.readFileSync(zshrcPath, 'utf8');
    const username = readZshrcValue(content, 'BITBUCKET_USERNAME');
    const token = readZshrcValue(content, 'BITBUCKET_APP_PASSWORD');
    if (!username || !token) {
        return null;
    }
    return { username, token };
};
export const loadCredentials = () => {
    if (cachedCredentials) {
        return cachedCredentials;
    }
    const username = process.env.BITBUCKET_USERNAME?.trim();
    const token = process.env.BITBUCKET_APP_PASSWORD?.trim() ||
        process.env.BITBUCKET_TOKEN?.trim();
    if (username && token) {
        cachedCredentials = { username, token };
        return cachedCredentials;
    }
    const fromZshrc = loadCredentialsFromZshrc();
    if (fromZshrc) {
        cachedCredentials = fromZshrc;
        return cachedCredentials;
    }
    throw new Error('Set BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD (or BITBUCKET_TOKEN) as env vars, in mcp.json env, or in ~/.zshrc');
};
const requireRepoField = (value, field) => {
    const trimmed = value?.trim();
    if (!trimmed) {
        throw new Error(`Missing repository.${field} in ${getConfigPath()}. Copy examples/config.json and run npm run init-config`);
    }
    return trimmed;
};
export const loadConfig = () => {
    if (cachedConfig) {
        return cachedConfig;
    }
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config not found at ${configPath}. Run: npm run init-config (from repo) or copy examples/config.json`);
    }
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    cachedConfig = {
        repository: {
            workspace: requireRepoField(raw.repository?.workspace, 'workspace'),
            slug: requireRepoField(raw.repository?.slug, 'slug'),
        },
        reviewers: {
            useEffectiveDefaultReviewers: raw.reviewers?.useEffectiveDefaultReviewers ??
                DEFAULT_REVIEWERS.useEffectiveDefaultReviewers,
            includeAuthorAsReviewer: raw.reviewers?.includeAuthorAsReviewer ??
                DEFAULT_REVIEWERS.includeAuthorAsReviewer,
            extraUsernames: Array.isArray(raw.reviewers?.extraUsernames)
                ? raw.reviewers.extraUsernames
                    .filter((u) => typeof u === 'string' && !!u.trim())
                    .map(u => u.trim())
                : [],
        },
    };
    return cachedConfig;
};
export const getRepoApiPrefix = (config) => `https://api.bitbucket.org/2.0/repositories/${config.repository.workspace}/${config.repository.slug}`;
