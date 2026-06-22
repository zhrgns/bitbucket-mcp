#!/usr/bin/env node
import { startServer } from './mcp/server.js';

try {
  await startServer();
} catch (error) {
  console.error(error);
  process.exit(1);
}
