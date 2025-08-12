import {ChildProcess} from 'child_process';
import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class BrowserNavigateCommand extends McpCommandBase {
    name = 'browser-navigate';
    description = 'TODO';
    aliases = ['bn'];

    protected sendAdditionalRequests(mcpProcess: ChildProcess): void {
        const enableDebugRequest: McpRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'browser_navigate',
                arguments: {url: "http://localhost:3000"}
            }
        };

        mcpProcess.stdin?.write(JSON.stringify(enableDebugRequest) + '\n');
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
    }
}

export const browserNavigateCommand = new BrowserNavigateCommand();