import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const CONFIG_DIR = path.join(os.homedir(), '.config/bitbucket-mcp');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
export const getConfigPath = () => process.env.BITBUCKET_MCP_CONFIG?.trim() || DEFAULT_CONFIG_PATH;
export const getConfigDir = () => path.dirname(getConfigPath());
export const getRepoApiPrefix = (workspace, slug) => `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}`;
export const ensureConfigDir = () => {
    fs.mkdirSync(getConfigDir(), { recursive: true, mode: 0o700 });
};
export const writePrivateFile = (filePath, content) => {
    ensureConfigDir();
    fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
};
