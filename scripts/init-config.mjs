import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.join(os.homedir(), '.config/bitbucket-mcp');
const configPath = path.join(configDir, 'config.json');
const examplePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/config.json'
);

if (fs.existsSync(configPath)) {
  console.log(`Config already exists: ${configPath}`);
  process.exit(0);
}

fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
fs.copyFileSync(examplePath, configPath);
fs.chmodSync(configPath, 0o600);
console.log(`Created ${configPath}`);
console.log('Edit workspace and slug, then restart Cursor.');
