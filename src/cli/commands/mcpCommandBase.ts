import type {Command} from './types.js';
import {mcpConnection} from './mcpConnection.js';

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

    async execute(_args: string[]): Promise<void> {
        try {
            const response = await this.executeCommand();
            await this.processResponse(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    protected abstract executeCommand(): Promise<McpResponse>;
    protected abstract processResponse(response: McpResponse): Promise<void>;

    protected handleError(error: any): void {
        console.error('Error executing command:', error instanceof Error ? error.message : String(error));
    }
}