import { Command } from './types.js';

export const dateCommand: Command = {
  name: 'date',
  description: 'Show current date/time',
  execute: () => {
    console.log(new Date().toLocaleString());
  }
};