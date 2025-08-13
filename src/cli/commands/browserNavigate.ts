import {McpCommandBase, McpResponse} from './mcpCommandBase.js';
import {mcpConnection} from './mcpConnection.js';

class BrowserNavigateCommand extends McpCommandBase {
    name = 'browser-navigate';
    description = 'Navigate browser to a URL';
    aliases = ['bn'];

    protected async executeCommand(): Promise<McpResponse> {
        return mcpConnection.callTool('browser_navigate', {url: "http://localhost:3000"});
    }

    protected async processResponse(response: McpResponse): Promise<void> {
        console.log('Response:', JSON.stringify(response));
        
        if (response.error) {
            console.error('❌ Error navigating:', response.error);
            return;
        }
        
        if (response.result) {
            console.log('✅ Successfully navigated to http://localhost:3000');
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

export const browserNavigateCommand = new BrowserNavigateCommand();