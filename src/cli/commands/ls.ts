import * as fs from 'fs';
import * as path from 'path';
import {Command} from './types.js';

export const lsCommand: Command = {
    name: 'ls',
    description: 'List files',
    execute: (args: string[]) => {
        const targetDir = args[0] || '.';
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
};
