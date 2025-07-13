/**
 * Log command - Show visual version timeline
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class LogCommand extends BaseCommand {
  async validate(_args: string[]): Promise<void> {
    // No specific validation needed for log
  }

  async execute(args: string[]): Promise<void> {
    const options = this.parseOptions(args);

    try {
      const oops = new Oops();

      // Get workspace info
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        this.log('No workspace found. Start tracking a file first with: oops <file>');
        return;
      }

      // Get all tracked files
      const trackedFiles = await oops.getAllTrackedFiles();
      if (trackedFiles.length === 0) {
        this.log('No files being tracked. Start tracking a file first with: oops <file>');
        return;
      }

      this.log('Version history:');
      this.log('');

      // For Phase 2a, show basic version history based on tracking info
      // In Phase 2b, we'll implement proper version tracking

      if (options.graph || options.oneline) {
        // Show compact format
        this.log('* 1.1 (HEAD, current) Working changes');
        for (const file of trackedFiles) {
          const status = (await oops.hasChanges(file.filePath)) ? 'modified' : 'clean';
          this.log(`  ${file.filePath} - ${status}`);
        }
        this.log('* 1.0 (tag: 1.0) Initial tracking');
      } else {
        // Show detailed format
        this.log('version 1.1 (HEAD -> current)');
        this.log('Date: ' + new Date().toISOString());
        this.log('');
        this.log('    Working changes');
        this.log('');

        for (const file of trackedFiles) {
          const hasChanges = await oops.hasChanges(file.filePath);
          if (hasChanges) {
            const diffResult = await oops.diff(file.filePath);
            this.log(
              `    Modified: ${file.filePath} (+${diffResult.addedLines}/-${diffResult.removedLines})`
            );
          }
        }

        this.log('');
        this.log('version 1.0 (tag: 1.0)');
        this.log('Date: ' + workspaceInfo.createdAt.toISOString());
        this.log('');
        this.log('    Initial file tracking');

        for (const file of trackedFiles) {
          this.log(`    Added: ${file.filePath}`);
        }
      }

      this.log('');
      this.log('\nTip: Use "oops commit" to create version 1.2');
    } catch (error: any) {
      this.error('Failed to show log: ' + error.message);
      throw error;
    }
  }

  private parseOptions(args: string[]) {
    return {
      graph: args.includes('--graph'),
      oneline: args.includes('--oneline'),
      decorate: args.includes('--decorate'),
    };
  }
}
