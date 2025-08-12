import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {Command} from './commands/index.js';

// Command registry to store registered commands
class CommandRegistry {
    private commands = new Map<string, Command>();

    register(command: Command): void {
        this.commands.set(command.name.toLowerCase(), command);

        // Register aliases
        if (command.aliases) {
            command.aliases.forEach((alias: string) => {
                this.commands.set(alias.toLowerCase(), command);
            });
        }
    }

    get(name: string): Command | undefined {
        return this.commands.get(name.toLowerCase());
    }

    getAll(): Command[] {
        const uniqueCommands = new Set<Command>();
        this.commands.forEach(cmd => uniqueCommands.add(cmd));
        return Array.from(uniqueCommands);
    }
}

export class SimpleShell {
    private rl: readline.Interface;
    private historyFile: string;
    private history: string[] = [];
    private isClosing = false;
    private commandRegistry = new CommandRegistry();

    constructor() {
        // Set up history file in user's home directory
        this.historyFile = path.join(os.homedir(), '.shell_history');
        this.loadHistory();

        // Create readline interface with history support
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> ',
            historySize: 100,
            removeHistoryDuplicates: true
        });

        // Add history to readline
        this.history.forEach(cmd => {
            (this.rl as any).history.push(cmd);
        });

        // Register built-in commands
        this.registerBuiltinCommands();
    }

    private loadHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const content = fs.readFileSync(this.historyFile, 'utf8');
                this.history = content.split('\n').filter(line => line.trim());
            }
        } catch (error) {
            // Ignore history load errors
        }
    }

    private saveHistory(command: string) {
        if (!command.trim())
            return;

        try {
            fs.appendFileSync(this.historyFile, command + '\n');
        } catch (error) {
            // Ignore history save errors
        }
    }

    async start() {
        this.showWelcome();
        this.setupCommands();
        this.rl.prompt();
    }

    // Allow external registration of commands
    registerCommand(command: Command): void {
        this.commandRegistry.register(command);
    }

    private setupCommands() {
        this.rl.on('line', async input => {
            const command = input.trim();

            if (!command) {
                this.rl.prompt();
                return;
            }

            // Save to history
            this.saveHistory(command);

            await this.handleCommand(command);

            if (!this.isClosing)
                this.rl.prompt();


        });

        this.rl.on('close', async () => {
            await this.cleanup();
        });

        // Handle Ctrl+C gracefully
        process.on('SIGINT', async () => {
            console.log('\nGoodbye!');
            await this.cleanup();
        });
    }

    private async handleCommand(command: string) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Check if command is registered
        const registeredCommand = this.commandRegistry.get(cmd);
        if (registeredCommand) {
            try {
                await registeredCommand.execute(args);
            } catch (error: any) {
                console.error(`Error executing command '${cmd}': ${error.message}`);
            }
            return;
        }

        console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
    }

    private registerBuiltinCommands(): void {
        // Help command
        this.commandRegistry.register({
            name: 'help',
            description: 'Show available commands',
            execute: () => this.showHelp()
        });

        // Clear command
        this.commandRegistry.register({
            name: 'clear',
            description: 'Clear the screen',
            execute: () => console.clear()
        });

        // History command
        this.commandRegistry.register({
            name: 'history',
            description: 'Show command history',
            execute: () => this.showHistory()
        });
        // Exit commands
        this.commandRegistry.register({
            name: 'exit',
            description: 'Exit the shell',
            aliases: ['quit'],
            execute: async () => {
                await this.cleanup();
            }
        });
    }

    private showWelcome() {
        console.log('Interactive Shell');
        console.log('Type "help" for available commands\n');
    }

    private showHelp() {
        const commands = this.commandRegistry.getAll();

        console.log('\nAvailable commands:');
        commands.forEach(cmd => {
            const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
            console.log(`  ${cmd.name.padEnd(10)} - ${cmd.description}${aliases}`);
        });

        console.log(`
Command line editing:
  ↑/↓       - Navigate history
  Ctrl+A    - Move to start of line
  Ctrl+E    - Move to end of line
  Ctrl+K    - Delete to end of line
  Ctrl+U    - Delete to start of line
  Tab       - Auto-complete (if available)
`);
    }

    private showHistory() {
        if (this.history.length === 0) {
            console.log('No command history');
            return;
        }

        console.log('Command history:');
        this.history.forEach((cmd, index) => {
            console.log(`  ${index + 1}  ${cmd}`);
        });
    }


    private async cleanup() {
        if (this.isClosing)
            return;

        this.isClosing = true;

        this.rl.close();
        process.exit(0);
    }
}
