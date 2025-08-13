import {McpCommandBase, McpResponse} from './mcpCommandBase.js';
import {mcpConnection} from './mcpConnection.js';

class EnableDebugModeCommand extends McpCommandBase {
    name = 'enable-debug-mode';
    description = 'Enable debug mode on the PDF engine debugging interface';
    aliases = ['ed', 'edm'];

    protected async executeCommand(): Promise<McpResponse> {
        return mcpConnection.callTool('enable_debug_mode', {});
    }

    protected async processResponse(response: McpResponse): Promise<void> {
        console.log('Response:', JSON.stringify(response));
        
        if (response.error) {
            console.error('❌ Error enabling debug mode:', response.error);
            return;
        }
        
        if (response.result) {
            console.log('✅ Debug mode enabled successfully');
            if (response.result.content) {
                for (const content of response.result.content) {
                    if (content.type === 'text') {
                        console.log(content.text);
                    }
                }
            }
        } else {
            console.log('⚠️  No result from enable_debug_mode tool call');
            console.log('💡 This tool requires an active browser session. Try navigating to a page first.');
        }
    }
}

export const enableDebugModeCommand = new EnableDebugModeCommand();