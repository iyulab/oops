/**
 * Main CLI class for Oops
 */

import { Command } from 'commander';
import {
  StatusCommand,
  DiffCommand,
  CommitCommand,
  CheckoutCommand,
  LogCommand,
  TrackCommand,
  UntrackCommand,
  KeepCommand,
  UndoCommand,
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
    const statusCommand = new StatusCommand();
    const diffCommand = new DiffCommand();
    const commitCommand = new CommitCommand();
    const checkoutCommand = new CheckoutCommand();
    const logCommand = new LogCommand();
    const untrackCommand = new UntrackCommand();
    const keepCommand = new KeepCommand();
    const undoCommand = new UndoCommand();

    this.program
      .command('track <file>')
      .description('Start versioning a file')
      .action(async (file, _options, _command) => {
        try {
          await new TrackCommand().validate([file]);
          await new TrackCommand().execute([file]);
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
      .command('diff [version]')
      .description('Show changes compared to version')
      .option('--tool <tool>', 'Use external diff tool')
      .action(async (version, options, _command) => {
        try {
          const args = version ? [version] : [];
          if (options.tool) args.push('--tool', options.tool);
          await diffCommand.validate(args);
          await diffCommand.execute(args);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('commit [message]')
      .description('Create a new version checkpoint')
      .action(async (message, _options, _command) => {
        try {
          const args = message ? [message] : [];
          await commitCommand.validate(args);
          await commitCommand.execute(args);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('checkout <version>')
      .description('Navigate to specific version')
      .action(async (version, _options, _command) => {
        try {
          await checkoutCommand.validate([version]);
          await checkoutCommand.execute([version]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('log')
      .description('Show version history')
      .option('--oneline', 'Show compact one-line format')
      .option('--graph', 'Show branch graph')
      .action(async (_options, _command) => {
        try {
          const args = [];
          if (_options.oneline) args.push('--oneline');
          if (_options.graph) args.push('--graph');
          await logCommand.validate(args);
          await logCommand.execute(args);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('untrack <file>')
      .description('Stop tracking file (keep current state)')
      .action(async (file, _options, _command) => {
        try {
          await untrackCommand.validate([file]);
          await untrackCommand.execute([file]);
        } catch (error: any) {
          console.error(colors.red('Error:'), error.message);
          process.exit(1);
        }
      });

    this.program
      .command('keep <file>')
      .description('Stop tracking file (alias for untrack)')
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
      .command('undo <file> [version]')
      .description('Restore version and stop tracking')
      .action(async (file, version, _options, _command) => {
        try {
          const args = version ? [file, version] : [file];
          await undoCommand.validate(args);
          await undoCommand.execute(args);
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
      const knownCommands = [
        'track',
        'status',
        'diff',
        'commit',
        'checkout',
        'log',
        'untrack',
        'keep',
        'undo',
      ];

      // If it's a known command, handle it
      if (knownCommands.includes(potentialCommand)) {
        if (potentialCommand === 'track') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'track command requires a file argument');
            console.error('Hint:', 'Usage: oops track <file>');
            process.exit(1);
            return;
          }
          const trackCommand = new TrackCommand();
          try {
            await trackCommand.validate([remainingArgs[1]]);
            await trackCommand.execute([remainingArgs[1]]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

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
          const diffCommand = new DiffCommand();
          try {
            const args = remainingArgs.slice(1); // Optional version argument
            await diffCommand.validate(args);
            await diffCommand.execute(args);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'commit') {
          const commitCommand = new CommitCommand();
          try {
            const args = remainingArgs.slice(1); // Optional message argument
            await commitCommand.validate(args);
            await commitCommand.execute(args);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'checkout') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'checkout command requires a version argument');
            console.error('Hint:', 'Usage: oops checkout <version>');
            process.exit(1);
            return;
          }
          const checkoutCommand = new CheckoutCommand();
          try {
            await checkoutCommand.validate([remainingArgs[1]]);
            await checkoutCommand.execute([remainingArgs[1]]);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'log') {
          const logCommand = new LogCommand();
          try {
            const args = remainingArgs.slice(1); // Optional flags
            await logCommand.validate(args);
            await logCommand.execute(args);
          } catch (error: any) {
            console.error(colors.red('Error:'), error.message);
            process.exit(1);
          }
          return;
        }

        if (potentialCommand === 'untrack') {
          if (remainingArgs.length < 2) {
            console.error(colors.red('Error:'), 'untrack command requires a file argument');
            console.error('Hint:', 'Usage: oops untrack <file>');
            process.exit(1);
            return;
          }
          const untrackCommand = new UntrackCommand();
          try {
            await untrackCommand.validate([remainingArgs[1]]);
            await untrackCommand.execute([remainingArgs[1]]);
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
            console.error('Hint:', 'Usage: oops undo <file> [version]');
            process.exit(1);
            return;
          }
          const undoCommand = new UndoCommand();
          try {
            const args = remainingArgs.slice(1); // file and optional version
            await undoCommand.validate(args);
            await undoCommand.execute(args);
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
