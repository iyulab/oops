/**
 * Main CLI class for Oops
 */

import { Command } from 'commander';
import { StatusCommand, DiffCommand, KeepCommand, UndoCommand, TrackCommand } from './commands';
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
    const statusCommand = new StatusCommand();
    const diffCommand = new DiffCommand();
    const keepCommand = new KeepCommand();
    const undoCommand = new UndoCommand();

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
      // Handle NO_COLOR environment variable
      if (process.env.NO_COLOR) {
        // Disable colors
        Object.keys(colors).forEach(key => {
          colors[key as keyof typeof colors] = (text: string) => text;
        });
      }

      // If no arguments provided, run status command
      if (argv.length <= 2) {
        const statusCommand = new StatusCommand();
        try {
          await statusCommand.validate([]);
          await statusCommand.execute([]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
        return;
      }

      // Parse global options manually to handle them before command parsing
      const args = argv.slice(2); // Remove 'node' and 'oops'
      let currentArgIndex = 0;
      const globalOptions: any = {};

      // Process global options
      while (currentArgIndex < args.length) {
        const arg = args[currentArgIndex];

        if (arg === '--help' || arg === '-h') {
          // Prevent commander from calling process.exit
          this.program.exitOverride();
          try {
            this.program.help();
          } catch (err: any) {
            // Commander throws when exitOverride is set - this is expected
            return;
          }
          return;
        }

        if (arg === '--version' || arg === '-V') {
          console.log(packageJson.version);
          return;
        }

        if (arg === '--workspace') {
          globalOptions.workspace = args[currentArgIndex + 1];
          currentArgIndex += 2;
          continue;
        }

        if (arg === '--verbose' || arg === '-v') {
          globalOptions.verbose = true;
          currentArgIndex++;
          continue;
        }

        if (arg === '--quiet' || arg === '-q') {
          globalOptions.quiet = true;
          currentArgIndex++;
          continue;
        }

        if (arg === '--no-color') {
          globalOptions.noColor = true;
          // Disable colors immediately
          Object.keys(colors).forEach(key => {
            colors[key as keyof typeof colors] = (text: string) => text;
          });
          currentArgIndex++;
          continue;
        }

        if (arg === '--yes') {
          globalOptions.yes = true;
          currentArgIndex++;
          continue;
        }

        // If we reach here, it's either a command or a file
        break;
      }

      // Get remaining arguments (command or file)
      const remainingArgs = args.slice(currentArgIndex);

      if (remainingArgs.length === 0) {
        // Only global options provided, run status
        const statusCommand = new StatusCommand();
        try {
          await statusCommand.validate([]);
          await statusCommand.execute([]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
        return;
      }

      const potentialCommand = remainingArgs[0];
      const knownCommands = ['status', 'diff', 'keep', 'undo'];

      // If it's a known command, handle it
      if (knownCommands.includes(potentialCommand)) {
        if (potentialCommand === 'status') {
          const statusCommand = new StatusCommand();
          try {
            await statusCommand.validate([]);
            await statusCommand.execute([]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'diff') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'diff command requires a file argument');
            console.error('Hint:', 'Usage: oops diff <file>');
            process.exit(1);
            return;
          }
          const diffCommand = new DiffCommand();
          try {
            await diffCommand.validate([remainingArgs[1]]);
            await diffCommand.execute([remainingArgs[1]]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'keep') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'keep command requires a file argument');
            console.error('Hint:', 'Usage: oops keep <file>');
            process.exit(1);
            return;
          }
          const keepCommand = new KeepCommand();
          try {
            await keepCommand.validate([remainingArgs[1]]);
            await keepCommand.execute([remainingArgs[1]]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'undo') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'undo command requires a file argument');
            console.error('Hint:', 'Usage: oops undo <file>');
            process.exit(1);
            return;
          }
          const undoCommand = new UndoCommand();
          try {
            await undoCommand.validate([remainingArgs[1]]);
            await undoCommand.execute([remainingArgs[1]]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }
      }

      // Check if it's an unknown command (starts with letter and not a file)
      if (
        !potentialCommand.includes('.') &&
        !potentialCommand.includes('/') &&
        !potentialCommand.includes('\\')
      ) {
        console.error(colors.red('Error:'), `unknown command '${potentialCommand}'`);
        console.error('Hint:', 'Run "oops --help" to see available commands');
        process.exit(1);
        return;
      }

      // Otherwise, treat it as a file argument for tracking
      const trackCommand = new TrackCommand();
      try {
        await trackCommand.validate([potentialCommand]);
        await trackCommand.execute([potentialCommand]);
      } catch (error: any) {
        console.error(colors.red('Error:'), error.message);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(colors.red('Error:'), error.message || error);
      process.exit(1);
    }
  }
}
