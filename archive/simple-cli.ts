/**
 * Simple CLI - Aligned with Project's Core Purpose
 *
 * Purpose: Safe text file editing with automatic backup and simple undo
 * Commands: 5 essential commands only
 */

import { SimpleBackup } from '@iyulab/oops';
import * as path from 'path';

// Simple color helper for console output (no external dependencies)
const colors = {
  yellow: (text: string) => (process.env.NO_COLOR ? text : `\u001b[33m${text}\u001b[0m`),
  green: (text: string) => (process.env.NO_COLOR ? text : `\u001b[32m${text}\u001b[0m`),
  cyan: (text: string) => (process.env.NO_COLOR ? text : `\u001b[36m${text}\u001b[0m`),
  red: (text: string) => (process.env.NO_COLOR ? text : `\u001b[31m${text}\u001b[0m`),
};

export class SimpleCLI {
  private backup: SimpleBackup;

  constructor() {
    // Use environment variable or default workspace
    const workspacePath = process.env.OOPS_WORKSPACE || undefined;
    this.backup = new SimpleBackup(workspacePath);
  }

  public async run(args: string[]): Promise<void> {
    try {
      const [, , command, ...restArgs] = args;

      // Handle version and help flags
      if (!command || command === '--help' || command === '-h') {
        this.showHelp();
        return;
      }

      if (command === '--version' || command === '-v') {
        this.showVersion();
        return;
      }

      // Handle main commands
      switch (command) {
        case 'status':
          await this.handleStatus();
          break;

        case 'diff':
          await this.handleDiff(restArgs[0]);
          break;

        case 'keep':
          await this.handleKeep(restArgs[0]);
          break;

        case 'undo':
          await this.handleUndo(restArgs[0]);
          break;

        default:
          // Default: treat as file to track (oops <file>)
          await this.handleTrack(command);
          break;
      }
    } catch (error: any) {
      this.error('Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Handle: oops <file> - Start tracking with auto-backup
   */
  private async handleTrack(filePath: string): Promise<void> {
    if (!filePath) {
      this.error('Error:', 'Usage: oops <file>');
      this.log('Start tracking a file for safe editing.');
      process.exit(1);
    }

    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);

    // Check if already tracked
    if (await this.backup.isTracked(resolvedPath)) {
      const hasChanges = await this.backup.hasChanges(resolvedPath);
      this.log(`📊 ${fileName} - Already tracking`);

      if (hasChanges) {
        this.log(`   Status: ${colors.yellow('Modified')} (has changes)`);
        this.log('');
        this.log('Next steps:');
        this.log(`   oops diff ${fileName}  - View changes`);
        this.log(`   oops keep ${fileName}  - Accept changes`);
        this.log(`   oops undo ${fileName}  - Revert changes`);
      } else {
        this.log(`   Status: ${colors.green('Clean')} (no changes)`);
        this.log('');
        this.log('📝 Edit the file, then use:');
        this.log(`   oops diff ${fileName}  - View changes`);
        this.log(`   oops keep ${fileName}  - Accept changes`);
      }
      return;
    }

    // Start tracking
    await this.backup.startTracking(resolvedPath);

    this.log(`✓ Started tracking ${colors.cyan(fileName)}`);
    this.log(`  Backup created automatically`);
    this.log('');
    this.log('🛡️  Your file is now protected!');
    this.log('   Edit the file safely, then:');
    this.log(`   oops diff     - View changes`);
    this.log(`   oops keep ${fileName}  - Accept changes`);
    this.log(`   oops undo ${fileName}  - Revert changes`);
  }

  /**
   * Handle: oops status - Show tracked files and their status
   */
  private async handleStatus(): Promise<void> {
    const status = await this.backup.getStatus();

    if (status.totalFiles === 0) {
      this.log('No files being tracked');
      this.log('');
      this.log('Start tracking a file with: oops <file>');
      return;
    }

    this.log(`Tracked files (${status.totalFiles}):`);
    this.log('');

    for (const file of status.trackedFiles) {
      const fileName = path.basename(file.filePath);
      const statusIcon = file.hasChanges ? '📝' : '✅';
      const statusText = file.hasChanges ? colors.yellow('modified') : colors.green('clean');

      this.log(`  ${statusIcon} ${statusText} ${fileName}`);

      if (file.hasChanges) {
        this.log(
          `      Use: oops diff ${fileName} | oops keep ${fileName} | oops undo ${fileName}`
        );
      }
    }
  }

  /**
   * Handle: oops diff [file] - Show changes
   */
  private async handleDiff(filePath?: string): Promise<void> {
    if (filePath) {
      // Show diff for specific file
      const resolvedPath = path.resolve(filePath);

      if (!(await this.backup.isTracked(resolvedPath))) {
        this.error('Error:', `File is not being tracked: ${path.basename(filePath)}`);
        this.log('Start tracking with: oops <file>');
        process.exit(1);
      }

      if (!(await this.backup.hasChanges(resolvedPath))) {
        this.log(`No changes in ${path.basename(filePath)}`);
        return;
      }

      const diff = await this.backup.getDiff(resolvedPath);
      this.log(diff);
    } else {
      // Show diff for all tracked files with changes
      const status = await this.backup.getStatus();
      const modifiedFiles = status.trackedFiles.filter(f => f.hasChanges);

      if (modifiedFiles.length === 0) {
        this.log('No changes detected');
        return;
      }

      for (const file of modifiedFiles) {
        this.log(`\n${colors.cyan(`=== ${path.basename(file.filePath)} ===`)}`);
        const diff = await this.backup.getDiff(file.filePath);
        this.log(diff);
      }
    }
  }

  /**
   * Handle: oops keep <file> - Accept changes and stop tracking
   */
  private async handleKeep(filePath: string): Promise<void> {
    if (!filePath) {
      this.error('Error:', 'Usage: oops keep <file>');
      process.exit(1);
    }

    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);

    if (!(await this.backup.isTracked(resolvedPath))) {
      this.error('Error:', `File is not being tracked: ${fileName}`);
      this.log('Start tracking with: oops <file>');
      process.exit(1);
    }

    await this.backup.keep(resolvedPath);

    this.log(`✅ Kept changes in ${colors.green(fileName)}`);
    this.log('   File is no longer tracked');
    this.log('   Your changes are now permanent');
  }

  /**
   * Handle: oops undo <file> - Restore from backup and stop tracking
   */
  private async handleUndo(filePath: string): Promise<void> {
    if (!filePath) {
      this.error('Error:', 'Usage: oops undo <file>');
      process.exit(1);
    }

    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);

    if (!(await this.backup.isTracked(resolvedPath))) {
      this.error('Error:', `File is not being tracked: ${fileName}`);
      this.log('Start tracking with: oops <file>');
      process.exit(1);
    }

    await this.backup.undo(resolvedPath);

    this.log(`🔄 Restored ${colors.cyan(fileName)} from backup`);
    this.log('   File is no longer tracked');
    this.log('   All changes have been reverted');
  }

  private showHelp(): void {
    this.log('Oops - Safe text file editing with automatic backup');
    this.log('');
    this.log('Usage:');
    this.log('  oops <file>      Start tracking a file (creates backup)');
    this.log('  oops status      Show tracked files and their status');
    this.log('  oops diff [file] Show changes (all files or specific file)');
    this.log('  oops keep <file> Accept changes and stop tracking');
    this.log('  oops undo <file> Restore from backup and stop tracking');
    this.log('');
    this.log('Workflow:');
    this.log('  1. oops config.txt    # Start tracking');
    this.log('  2. [edit the file]    # Make your changes');
    this.log('  3. oops diff          # Review changes');
    this.log('  4. oops keep config.txt OR oops undo config.txt');
    this.log('');
    this.log('Options:');
    this.log('  --help, -h       Show this help');
    this.log('  --version, -v    Show version');
  }

  private showVersion(): void {
    this.log('0.1.0');
  }

  private log(message: string): void {
    // Respect NO_COLOR environment variable for testing
    if (process.env.NO_COLOR) {
      // Strip ANSI codes for testing
      // eslint-disable-next-line no-control-regex
      const stripped = message.replace(/\u001b\[[0-9;]*m/g, '');
      console.log(stripped);
    } else {
      console.log(message);
    }
  }

  private error(prefix: string, message: string): void {
    // Respect NO_COLOR environment variable for testing
    if (process.env.NO_COLOR) {
      console.error(prefix, message);
    } else {
      console.error(colors.red(prefix), message);
    }
  }
}
