import {ChildProcess} from 'child_process';
import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class ListToolsCommand extends McpCommandBase {
    name = 'list-tools';
    description = 'List all available tools from the Playwright MCP server';
    aliases = ['tools', 'lt'];

    protected sendAdditionalRequests(mcpProcess: ChildProcess): void {
        const listToolsRequest: McpRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        };

        mcpProcess.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));

        let tools: any[] = [];
        for (const response of responses) {
            if (response.id === 2 && response.result?.tools) {
                tools = response.result.tools;
                break;
            }
        }

        if (tools.length === 0) {
            console.log('No tools found or unable to parse response');
            return;
        }

        console.log(`\nFound ${tools.length} available tools:\n`);

        // Sort tools by name for consistent output
        const sortedTools = tools.sort((a, b) => a.name.localeCompare(b.name));

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