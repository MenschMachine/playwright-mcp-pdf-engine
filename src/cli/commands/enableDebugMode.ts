import {ChildProcess} from 'child_process';
import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class EnableDebugModeCommand extends McpCommandBase {
    name = 'enable-debug-mode';
    description = 'TODO';
    aliases = ['ed', 'edm'];

    protected sendAdditionalRequests(mcpProcess: ChildProcess): void {
        const listToolsRequest: McpRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tool/enable_debug_mode',
            params: {}
        };

        mcpProcess.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
    }
}

export const enableDebugModeCommand = new EnableDebugModeCommand();