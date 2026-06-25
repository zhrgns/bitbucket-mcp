import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './register-tools.js';
const packageRoot = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(packageRoot, '../../package.json'), 'utf8'));
export const startServer = async () => {
    const server = new McpServer({
        name: 'bitbucket-mcp',
        version,
    });
    registerTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
};
