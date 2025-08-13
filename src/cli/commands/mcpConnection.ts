import {ChildProcess, spawn} from 'child_process';
import {McpRequest, McpResponse} from './mcpCommandBase.js';
import {Mutex} from "async-mutex";

class McpConnection {
    private static instance: McpConnection;
    private mutex = new Mutex();
    private mcpProcess: ChildProcess | null = null;
    private responseBuffer = '';
    private errorBuffer = '';
    private requestId = 1;
    private pendingRequests = new Map<number, {
        resolve: (response: McpResponse) => void,
        reject: (error: Error) => void
    }>();
    private initialized = false;

    private constructor() {
    }

    static getInstance(): McpConnection {
        if (!McpConnection.instance) {
            McpConnection.instance = new McpConnection();
        }
        return McpConnection.instance;
    }

    async initialize(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            await this._initialize();
        });
    }

    private async _initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        console.log('[DEBUG] Initializing MCP connection...');
        const serverPath = '/Users/michael/Code/TFC/pdf-engine/staging/mcp-server/playwright-mcp';

        try {
            this.mcpProcess = spawn('npx', ['--yes', serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: serverPath,
                env: process.env
            });

            console.log('[DEBUG] MCP process spawned');
            this.setupStreams();

            // Send initialization request
            console.log('[DEBUG] Sending initialization request...');
            await this._sendRequest({
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'playwright-cli',
                        version: '1.0.0'
                    }
                }
            });
        } catch (error) {
            console.error(error);
        } finally {
            console.log('[DEBUG] MCP connection initialized2');
            this.initialized = true;
        }
    }

    private setupStreams(): void {
        if (!this.mcpProcess) {
            return;
        }

        this.mcpProcess.stdout?.on('data', (data) => {
            const chunk = data.toString();
            console.log('[DEBUG] Received stdout:', JSON.stringify(chunk));
            this.responseBuffer += chunk;
            this.processResponses();
        });

        this.mcpProcess.stderr?.on('data', (data) => {
            const chunk = data.toString();
            console.log('[DEBUG] Received stderr:', JSON.stringify(chunk));
            this.errorBuffer += chunk;
        });

        this.mcpProcess.on('exit', () => {
            this.initialized = false;
            this.mcpProcess = null;
            // Reject all pending requests
            for (const [id, {reject}] of this.pendingRequests) {
                reject(new Error('MCP server process exited with id "' + id + '"'));
            }
            this.pendingRequests.clear();
        });
    }

    private processResponses(): void {
        const lines = this.responseBuffer.split('\n');
        this.responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            try {
                const response: McpResponse = JSON.parse(line);
                const pending = this.pendingRequests.get(response.id);
                if (pending) {
                    this.pendingRequests.delete(response.id);
                    pending.resolve(response);
                }
            } catch (error) {
                console.error('Failed to parse MCP response:', line);
            }
        }
    }

    async sendRequest(request: McpRequest): Promise<McpResponse> {
        if (!this.mcpProcess || !this.initialized) {
            console.log('[DEBUG] Sending initialization request...');
            await this.initialize();
            console.log("[DEBUG] Sent initialization request...");
        }
        console.log(`[DEBUG] Sending request...`);
        return this._sendRequest(request);
    }

    private async _sendRequest(request: McpRequest): Promise<McpResponse> {
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, {resolve, reject});

            const requestString = JSON.stringify(request) + '\n';
            console.log('[DEBUG] Sending request:', JSON.stringify(request));
            this.mcpProcess?.stdin?.write(requestString);

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(request.id)) {
                    this.pendingRequests.delete(request.id);
                    reject(new Error(`Request ${request.id} timed out`));
                }
            }, 30000); // 30 second timeout
        });
    }

    async callTool(toolName: string, args: any = {}): Promise<McpResponse> {
        const request: McpRequest = {
            jsonrpc: '2.0',
            id: this.getNextId(),
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        };

        return this.sendRequest(request);
    }

    getNextId(): number {
        return ++this.requestId;
    }

    // noinspection JSUnusedGlobalSymbols
    async close(): Promise<void> {
        if (this.mcpProcess) {
            this.mcpProcess.kill();
            this.mcpProcess = null;
            this.initialized = false;
        }
    }
}

export const mcpConnection = McpConnection.getInstance();