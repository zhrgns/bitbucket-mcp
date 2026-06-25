#!/usr/bin/env node
import { startServer } from './mcp/server.js';
startServer().catch((error) => {
    console.error('[bitbucket-mcp]', error);
    process.exit(1);
});
