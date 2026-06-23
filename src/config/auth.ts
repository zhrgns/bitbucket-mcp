import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Credentials } from '../types/config.js';

let cached: Credentials | null = null;

const readZshrcValue = (content: string, key: string): string => {
  const quoted = content.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:export\\s+)?${key}\\s*=\\s*(['"\`])(.*?)\\1`,
      'm'
    )
  );
  if (quoted) {
    return quoted[2].trim();
  }

  const unquoted = content.match(
    new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?${key}\\s*=\\s*([^\\s#]+)`, 'm')
  );
  return unquoted?.[1]?.trim() ?? '';
};

const isZshrcFallbackEnabled = (): boolean => {
  const flag = process.env.BITBUCKET_MCP_READ_ZSHRC?.trim().toLowerCase();
  return flag === '1' || flag === 'true';
};

const loadFromZshrc = (): Credentials | null => {
  if (!isZshrcFallbackEnabled()) {
    return null;
  }

  const zshrcPath = path.join(os.homedir(), '.zshrc');
  if (!fs.existsSync(zshrcPath)) {
    return null;
  }

  const content = fs.readFileSync(zshrcPath, 'utf8');
  const username = readZshrcValue(content, 'BITBUCKET_USERNAME');
  const token =
    readZshrcValue(content, 'BITBUCKET_APP_PASSWORD') ||
    readZshrcValue(content, 'BITBUCKET_TOKEN');

  if (!username || !token) {
    return null;
  }

  return { username, token };
};

export const loadCredentials = (): Credentials => {
  if (cached) {
    return cached;
  }

  const username = process.env.BITBUCKET_USERNAME?.trim();
  const token =
    process.env.BITBUCKET_APP_PASSWORD?.trim() ||
    process.env.BITBUCKET_TOKEN?.trim();

  if (username && token) {
    cached = { username, token };
    return cached;
  }

  const fromZshrc = loadFromZshrc();
  if (fromZshrc) {
    cached = fromZshrc;
    return cached;
  }

  throw new Error(
    'Set BITBUCKET_USERNAME and BITBUCKET_TOKEN (or BITBUCKET_APP_PASSWORD) in mcp.json env. Optional: BITBUCKET_MCP_READ_ZSHRC=1 to read from ~/.zshrc'
  );
};
