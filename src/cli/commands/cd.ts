import * as os from 'os';
import { Command } from './types.js';

export const cdCommand: Command = {
  name: 'cd',
  description: 'Change directory',
  execute: (args: string[]) => {
    let dir = args[0];
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
};