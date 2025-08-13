import {McpCommandBase, McpResponse} from './mcpCommandBase.js';
import {mcpConnection} from './mcpConnection.js';

class ListToolsCommand extends McpCommandBase {
    name = 'list-tools';
    description = 'List all available tools from the Playwright MCP server';
    aliases = ['tools', 'lt'];

    protected async executeCommand(): Promise<McpResponse> {
        return mcpConnection.sendRequest({
            jsonrpc: '2.0',
            id: mcpConnection.getNextId(),
            method: 'tools/list',
            params: {}
        });
    }

    protected async processResponse(response: McpResponse): Promise<void> {
        if (response.error) {
            console.error('❌ Error listing tools:', response.error);
            return;
        }

        if (!response.result?.tools) {
            console.log('No tools found');
            return;
        }

        const tools = response.result.tools;
        console.log(`\nFound ${tools.length} available tools:\n`);

        // Sort tools by name for consistent output
        const sortedTools = tools.sort((a: any, b: any) => a.name.localeCompare(b.name));

        for (const tool of sortedTools) {
            console.log(`🔧 ${tool.name}`);
            console.log(`   ${tool.description}`);
            if (tool.annotations?.title && tool.annotations.title !== tool.name) {
                console.log(`   Title: ${tool.annotations.title}`);
            }
            if (tool.annotations?.readOnlyHint) {
                console.log(`   Type: Read-only`);
            } else if (tool.annotations?.destructiveHint) {
                console.log(`   Type: Destructive`);
            }
            console.log('');
        }

        console.log(`Total: ${tools.length} tools available`);
    }
}

export const listToolsCommand = new ListToolsCommand();