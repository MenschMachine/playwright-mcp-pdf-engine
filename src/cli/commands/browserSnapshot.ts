import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class BrowserSnapshotCommand extends McpCommandBase {
    name = 'browser-snapshot';
    description = 'Take a snapshot of the current browser page';
    aliases = ['bs'];

    protected buildAdditionalRequest(): McpRequest {
        return {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'browser_snapshot',
                arguments: {}
            }
        };
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
    }
}

export const browserSnapshotCommand = new BrowserSnapshotCommand();