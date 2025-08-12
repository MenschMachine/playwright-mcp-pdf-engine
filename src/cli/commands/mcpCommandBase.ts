import {exec} from 'child_process';
import {promisify} from 'util';
import {writeFile, unlink} from 'fs/promises';
import {join} from 'path';
import type {Command} from './types.js';

export interface McpRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params: any;
}

export interface McpResponse {
    jsonrpc: '2.0';
    id: number;
    result?: any;
    error?: any;
}

export abstract class McpCommandBase implements Command {
    abstract name: string;
    abstract description: string;
    aliases?: string[];

    protected readonly defaultServerPath = '/Users/michael/Code/TFC/pdf-engine/staging/mcp-server/playwright-mcp';
    protected readonly initializationDelay = 2000;

    async execute(_args: string[]): Promise<void> {
        try {
            // Create the request content
            const initRequest: McpRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'playwright-cli',
                        version: '1.0.0'
                    }
                }
            };

            const additionalRequest = this.buildAdditionalRequest();
            const requestContent = JSON.stringify(initRequest) + '\n' + JSON.stringify(additionalRequest) + '\n';
            
            // Write to temp file and pipe to server
            const tempFile = join('/tmp', `mcp-request-${Date.now()}.json`);
            await writeFile(tempFile, requestContent);
            
            const execAsync = promisify(exec);
            const { stdout, stderr } = await execAsync(`cat "${tempFile}" | node cli.js`, {
                cwd: this.defaultServerPath,
                timeout: 10000
            });
            
            // Clean up temp file
            await unlink(tempFile);
            
            // Parse responses
            const responses = this.parseResponses(stdout);
            await this.processResponses(responses);
            
            if (stderr) {
                console.error('MCP server stderr:', stderr);
            }
            
        } catch (error) {
            this.handleError(error);
        }
    }

    protected abstract buildAdditionalRequest(): McpRequest;

    protected parseResponses(responseBuffer: string): McpResponse[] {
        const lines = responseBuffer.trim().split('\n').filter(line => line.trim());
        const responses: McpResponse[] = [];

        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                responses.push(response);
            } catch {
                // Skip non-JSON lines
            }
        }

        return responses;
    }

    protected abstract processResponses(responses: McpResponse[]): Promise<void>;

    protected handleError(error: any): void {
        console.error('Error executing command:', error instanceof Error ? error.message : String(error));
    }
}