import {McpCommandBase, McpResponse} from './mcpCommandBase.js';
import {mcpConnection} from './mcpConnection.js';

class BrowserSnapshotCommand extends McpCommandBase {
    name = 'browser-snapshot';
    description = 'Take a snapshot of the current browser page';
    aliases = ['bs'];

    protected async executeCommand(): Promise<McpResponse> {
        return mcpConnection.callTool('browser_snapshot', {});
    }

    protected async processResponse(response: McpResponse): Promise<void> {
        console.log('Response:', JSON.stringify(response));
        
        if (response.error) {
            console.error('❌ Error taking snapshot:', response.error);
            return;
        }
        
        if (response.result) {
            console.log('✅ Successfully took browser snapshot');
            if (response.result.content) {
                for (const content of response.result.content) {
                    if (content.type === 'text') {
                        console.log(content.text);
                    }
                }
            }
        }
    }
}

export const browserSnapshotCommand = new BrowserSnapshotCommand();