import { Command } from './types.js';

export const echoCommand: Command = {
  name: 'echo',
  description: 'Echo arguments',
  execute: (args: string[]) => {
    console.log(args.join(' '));
  }
};