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

const loadFromZshrc = (): Credentials | null => {
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
    'Set BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD (or BITBUCKET_TOKEN) as env vars, in mcp.json env, or in ~/.zshrc'
  );
};
