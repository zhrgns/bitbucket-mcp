import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.config/bitbucket-mcp');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export const getConfigPath = (): string =>
  process.env.BITBUCKET_MCP_CONFIG?.trim() || DEFAULT_CONFIG_PATH;

export const getConfigDir = (): string => path.dirname(getConfigPath());

export const getRepoApiPrefix = (workspace: string, slug: string): string =>
  `https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}`;

export const ensureConfigDir = (): void => {
  fs.mkdirSync(getConfigDir(), { recursive: true, mode: 0o700 });
};

export const writePrivateFile = (filePath: string, content: string): void => {
  ensureConfigDir();
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
};
