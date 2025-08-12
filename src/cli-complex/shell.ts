#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { program } from 'commander';

class SimpleShell {
  private rl: readline.Interface;
  private historyFile: string;
  private history: string[] = [];
  private isClosing = false;

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
    if (!command.trim()) return;
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

  private setupCommands() {
    this.rl.on('line', async (input) => {
      const command = input.trim();
      
      if (!command) {
        this.rl.prompt();
        return;
      }

      // Save to history
      this.saveHistory(command);
      
      // Handle commands
      if (command === 'exit' || command === 'quit') {
        await this.cleanup();
        return;
      }

      await this.handleCommand(command);
      
      if (!this.isClosing) {
        this.rl.prompt();
      }
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

    switch (cmd) {
      case 'help':
        this.showHelp();
        break;
      
      case 'clear':
        console.clear();
        break;
      
      case 'history':
        this.showHistory();
        break;
      
      case 'echo':
        console.log(args.join(' '));
        break;
      
      case 'pwd':
        console.log(process.cwd());
        break;
      
      case 'cd':
        this.changeDirectory(args[0]);
        break;
      
      case 'ls':
        this.listFiles(args[0]);
        break;
      
      case 'date':
        console.log(new Date().toLocaleString());
        break;
        
      default:
        console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  }

  private showWelcome() {
    console.log('Interactive Shell');
    console.log('Type "help" for available commands\n');
  }

  private showHelp() {
    console.log(`
Available commands:
  help      - Show this help message
  clear     - Clear the screen
  history   - Show command history
  echo      - Echo arguments
  pwd       - Print working directory
  cd        - Change directory
  ls        - List files
  date      - Show current date/time
  exit      - Exit the shell
  quit      - Exit the shell

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

  private changeDirectory(dir?: string) {
    if (!dir) {
      dir = os.homedir();
    }
    
    try {
      process.chdir(dir);
      console.log(`Changed to: ${process.cwd()}`);
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  }

  private listFiles(dir?: string) {
    const targetDir = dir || '.';
    
    try {
      const files = fs.readdirSync(targetDir);
      files.forEach(file => {
        const fullPath = path.join(targetDir, file);
        const stats = fs.statSync(fullPath);
        const isDir = stats.isDirectory();
        console.log(`  ${isDir ? '[D]' : '[F]'} ${file}`);
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  }

  private async cleanup() {
    if (this.isClosing) return;
    this.isClosing = true;
    
    this.rl.close();
    process.exit(0);
  }
}

// CLI setup
program
  .version('1.0.0')
  .name('shell')
  .description('Simple interactive shell with command history')
  .action(async () => {
    const shell = new SimpleShell();
    await shell.start();
  });

// Start the shell
program.parseAsync(process.argv).catch((error) => {
  console.error('Shell failed:', error.message);
  process.exit(1);
});