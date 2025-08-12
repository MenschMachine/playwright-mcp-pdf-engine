import {spawn, ChildProcess} from 'child_process';
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
    protected readonly initializationDelay = 1000;

    async execute(_args: string[]): Promise<void> {
        try {
            const mcpProcess = this.spawnMcpServer();
            const {responseBuffer, errorBuffer} = this.setupProcessStreams(mcpProcess);
            
            await this.sendInitializationRequest(mcpProcess);
            await this.sendCustomRequests(mcpProcess);
            
            const responses = await this.waitForCompletion(mcpProcess, responseBuffer, errorBuffer);
            await this.processResponses(responses);
            
        } catch (error) {
            this.handleError(error);
        }
    }

    protected spawnMcpServer(): ChildProcess {
        return spawn('npx', ['--yes', this.defaultServerPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }

    protected setupProcessStreams(mcpProcess: ChildProcess): {responseBuffer: {value: string}, errorBuffer: {value: string}} {
        const responseBuffer = {value: ''};
        const errorBuffer = {value: ''};

        mcpProcess.stdout?.on('data', data => {
            responseBuffer.value += data.toString();
        });

        mcpProcess.stderr?.on('data', data => {
            errorBuffer.value += data.toString();
        });

        return {responseBuffer, errorBuffer};
    }

    protected async sendInitializationRequest(mcpProcess: ChildProcess): Promise<void> {
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

        mcpProcess.stdin?.write(JSON.stringify(initRequest) + '\n');
    }

    protected async sendCustomRequests(mcpProcess: ChildProcess): Promise<void> {
        setTimeout(() => {
            this.sendAdditionalRequests(mcpProcess);
            mcpProcess.stdin?.end();
        }, this.initializationDelay);
    }

    protected abstract sendAdditionalRequests(mcpProcess: ChildProcess): void;

    protected waitForCompletion(
        mcpProcess: ChildProcess, 
        responseBuffer: {value: string}, 
        errorBuffer: {value: string}
    ): Promise<McpResponse[]> {
        return new Promise<McpResponse[]>((resolve, reject) => {
            mcpProcess.on('close', code => {
                if (code !== 0) {
                    reject(new Error(`MCP server exited with code ${code}. Error: ${errorBuffer.value}`));
                    return;
                }

                try {
                    const responses = this.parseResponses(responseBuffer.value);
                    resolve(responses);
                } catch (parseError) {
                    reject(new Error(`Failed to parse response: ${parseError}`));
                }
            });

            mcpProcess.on('error', error => {
                reject(new Error(`Failed to start MCP server: ${error.message}`));
            });
        });
    }

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