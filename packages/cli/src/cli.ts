/**
 * Main CLI class for Oops
 */

import { Command } from 'commander';
import {
  InitCommand,
  StatusCommand,
  BeginCommand,
  DiffCommand,
  KeepCommand,
  UndoCommand,
  ListCommand,
} from './commands';
// Simple color helpers
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
};
import * as packageJson from '../package.json';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  private setupProgram() {
    this.program
      .name('oops')
      .description('Safe text file editing with automatic backup and simple undo')
      .version(packageJson.version)
      .option('-v, --verbose', 'Enable verbose output')
      .option('-q, --quiet', 'Suppress output')
      .option('--no-color', 'Disable colored output')
      .option('--workspace <path>', 'Use specific workspace path');

    // Add commands
    this.addCommands();
  }

  private addCommands() {
    const initCommand = new InitCommand();
    const statusCommand = new StatusCommand();
    const beginCommand = new BeginCommand();
    const diffCommand = new DiffCommand();
    const keepCommand = new KeepCommand();
    const undoCommand = new UndoCommand();

    this.program
      .command('init')
      .description('Initialize workspace for safe editing')
      .action(async (...args) => {
        try {
          await initCommand.validate(args);
          await initCommand.execute(args);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('status')
      .description('Show status of tracked files')
      .action(async (...args) => {
        try {
          await statusCommand.validate(args);
          await statusCommand.execute(args);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('begin <file>')
      .description('Start tracking changes to a file')
      .action(async (file, _options, _command) => {
        try {
          await beginCommand.validate([file]);
          await beginCommand.execute([file]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('diff <file>')
      .description('Show changes in a tracked file')
      .action(async (file, _options, _command) => {
        try {
          await diffCommand.validate([file]);
          await diffCommand.execute([file]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('keep <file>')
      .description('Apply changes and stop tracking the file')
      .action(async (file, _options, _command) => {
        try {
          await keepCommand.validate([file]);
          await keepCommand.execute([file]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('undo <file>')
      .description('Revert file to backup and stop tracking')
      .action(async (file, _options, _command) => {
        try {
          await undoCommand.validate([file]);
          await undoCommand.execute([file]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });
  }

  public async run(argv: string[]) {
    try {
      // If no command provided, run list command
      if (argv.length <= 2) {
        const listCommand = new ListCommand();
        await listCommand.execute([]);
        return;
      }

      await this.program.parseAsync(argv);
    } catch (error) {
      console.error(colors.red('Error:'), error);
      process.exit(1);
    }
  }
}
