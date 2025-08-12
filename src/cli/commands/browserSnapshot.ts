import {ChildProcess} from 'child_process';
import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class BrowserSnapshotCommand extends McpCommandBase {
    name = 'browser-snapshot';
    description = 'TODO';
    aliases = ['bs'];

    protected sendAdditionalRequests(mcpProcess: ChildProcess): void {
        const enableDebugRequest: McpRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'browser_snapshot',
                arguments: {}
            }
        };

        mcpProcess.stdin?.write(JSON.stringify(enableDebugRequest) + '\n');
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
    }
}

export const browserSnapshotCommand = new BrowserSnapshotCommand();