import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class BrowserNavigateCommand extends McpCommandBase {
    name = 'browser-navigate';
    description = 'Navigate browser to a URL';
    aliases = ['bn'];

    protected buildAdditionalRequest(): McpRequest {
        return {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'browser_navigate',
                arguments: {url: "http://localhost:3000"}
            }
        };
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
    }
}

export const browserNavigateCommand = new BrowserNavigateCommand();