import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.join(os.homedir(), '.config/bitbucket-mcp');
const configPath = path.join(configDir, 'config.json');
const examplePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../examples/config.json'
);

if (fs.existsSync(configPath)) {
  console.log(`Config already exists: ${configPath}`);
  process.exit(0);
}

fs.mkdirSync(configDir, { recursive: true });
fs.copyFileSync(examplePath, configPath);
console.log(`Created ${configPath}`);
console.log('Edit workspace and slug, then restart Cursor.');
