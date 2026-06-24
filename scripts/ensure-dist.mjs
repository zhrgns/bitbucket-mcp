import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const distEntry = path.join(root, '../dist/index.js');

if (fs.existsSync(distEntry)) {
  process.exit(0);
}

execSync('npx --yes typescript@5.8.3 tsc', {
  cwd: path.join(root, '..'),
  stdio: 'inherit',
});
