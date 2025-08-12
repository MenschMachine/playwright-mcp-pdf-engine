// Register extracted commands
import {program} from 'commander';
import {SimpleShell} from './shell.js';
import {cdCommand, dateCommand, echoCommand, lsCommand, pwdCommand} from './commands/index.js';


// CLI setup
program
    .version('1.0.0')
    .name('shell')
    .description('Simple interactive shell with command history')
    .action(async () => {
        const shell = new SimpleShell();

        shell.registerCommand(echoCommand);
        shell.registerCommand(pwdCommand);
        shell.registerCommand(cdCommand);
        shell.registerCommand(lsCommand);
        shell.registerCommand(dateCommand);

        await shell.start();
    });

// Start the shell
program.parseAsync(process.argv).catch(error => {
    console.error('Shell failed:', error.message);
    process.exit(1);
});
