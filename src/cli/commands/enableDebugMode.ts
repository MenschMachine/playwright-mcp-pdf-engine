import {McpCommandBase, McpRequest, McpResponse} from './mcpCommandBase.js';

class EnableDebugModeCommand extends McpCommandBase {
    name = 'enable-debug-mode';
    description = 'Enable debug mode on the PDF engine debugging interface';
    aliases = ['ed', 'edm'];

    protected buildAdditionalRequest(): McpRequest {
        return {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'enable_debug_mode',
                arguments: {}
            }
        };
    }

    protected async processResponses(responses: McpResponse[]): Promise<void> {
        console.log(responses.map(r => JSON.stringify(r)).join('\n'));
        for (const response of responses) {
            if (response.id === 2) {
                if (response.error) {
                    console.error('Error enabling debug mode:', response.error);
                    return;
                }

                if (response.result) {
                    console.log('\n✅ Debug mode enabled successfully');
                    if (response.result.content) {
                        for (const content of response.result.content) {
                            if (content.type === 'text') {
                                console.log(content.text);
                            }
                        }
                    }
                    return;
                }
            }
        }

        console.log('⚠️  No response from enable_debug_mode tool call');
        console.log('💡 This tool requires an active browser session. Try navigating to a page first.');
    }
}

export const enableDebugModeCommand = new EnableDebugModeCommand();