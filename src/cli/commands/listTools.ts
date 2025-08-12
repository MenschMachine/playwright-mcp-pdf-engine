import { spawn } from 'child_process';
import type { Command } from './types.js';

export const listToolsCommand: Command = {
  name: 'list-tools',
  description: 'List all available tools from the Playwright MCP server',
  aliases: ['tools', 'lt'],
  async execute(_args: string[]): Promise<void> {
    try {
      // Start the MCP server via node in STDIO mode
      const mcpProcess = spawn('node', ['/Users/michael/Code/TFC/pdf-engine/staging/mcp-server/playwright-mcp/lib/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let responseBuffer = '';
      let errorBuffer = '';

      mcpProcess.stdout.on('data', data => {
        responseBuffer += data.toString();
      });

      mcpProcess.stderr.on('data', data => {
        errorBuffer += data.toString();
      });

      // Send MCP initialization request
      const initRequest = {
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

      mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

      // Wait for initialization response and send list_tools request
      setTimeout(() => {
        const listToolsRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        };
        
        mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
        mcpProcess.stdin.end();
      }, 1000);

      await new Promise<void>((resolve, reject) => {
        mcpProcess.on('close', code => {
          if (code !== 0) {
            reject(new Error(`MCP server exited with code ${code}. Error: ${errorBuffer}`));
            return;
          }

          try {
            // Parse the response lines
            const lines = responseBuffer.trim().split('\n').filter(line => line.trim());
            console.log(lines.join('\n'));
            
            let tools: any[] = [];
            for (const line of lines) {
              try {
                const response = JSON.parse(line);
                if (response.id === 2 && response.result?.tools) {
                  tools = response.result.tools;
                  break;
                }
              } catch {
                // Skip non-JSON lines
              }
            }

            if (tools.length === 0) {
              console.log('No tools found or unable to parse response');
              resolve();
              return;
            }

            console.log(`\nFound ${tools.length} available tools:\n`);
            
            // Sort tools by name for consistent output
            const sortedTools = tools.sort((a, b) => a.name.localeCompare(b.name));
            
            for (const tool of sortedTools) {
              console.log(`🔧 ${tool.name}`);
              console.log(`   ${tool.description}`);
              if (tool.annotations?.title && tool.annotations.title !== tool.name) {
                console.log(`   Title: ${tool.annotations.title}`);
              }
              if (tool.annotations?.readOnlyHint) {
                console.log(`   Type: Read-only`);
              } else if (tool.annotations?.destructiveHint) {
                console.log(`   Type: Destructive`);
              }
              console.log('');
            }
            
            console.log(`Total: ${tools.length} tools available`);
            resolve();
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError}`));
          }
        });

        mcpProcess.on('error', error => {
          reject(new Error(`Failed to start MCP server: ${error.message}`));
        });
      });

    } catch (error) {
      console.log(error);
      console.error('Error listing tools:', error instanceof Error ? error.message : String(error));
    }
  }
};