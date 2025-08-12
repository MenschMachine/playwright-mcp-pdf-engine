// Command interface for registration system
export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  execute(args: string[]): Promise<void> | void;
}