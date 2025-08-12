import { Command } from './types.js';

export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print working directory',
  execute: () => {
    console.log(process.cwd());
  }
};