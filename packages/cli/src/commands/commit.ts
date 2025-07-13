/**
 * Commit command - Create a new version checkpoint
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class CommitCommand extends BaseCommand {
  async validate(_args: string[]): Promise<void> {
    // No specific validation needed for commit - it will check for changes
  }

  async execute(args: string[]): Promise<void> {
    const message = args[0] || undefined; // Optional commit message (first argument)

    try {
      const oops = new Oops();

      // Get workspace info
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        throw new Error('No workspace found. Start tracking a file first with: oops <file>');
      }

      // Commit all files with changes
      this.log('Creating version checkpoint...');

      // Get tracked files
      const trackedFiles = await oops.getAllTrackedFiles();

      let commitCount = 0;

      for (const file of trackedFiles) {
        const filePath = file.filePath;
        try {
          // Check for changes using the version system
          if (await oops.hasVersionChanges(filePath)) {
            const result = await oops.commitVersion(filePath, message || 'Auto-generated commit');
            commitCount++;

            const fileName = path.basename(filePath);
            this.log(`✓ Version ${result.version} created for ${fileName}`);

            if (message) {
              this.log(`  Message: ${message}`);
            }
          }
        } catch (error: any) {
          // File not being version tracked, try to start tracking with version
          if (error.message.includes('not being tracked')) {
            try {
              const result = await oops.trackWithVersion(filePath, 'Initial version');
              commitCount++;

              const fileName = path.basename(filePath);
              this.log(`✓ Version ${result.version} created for ${fileName}`);
              this.log(`  Message: Initial version`);
            } catch (initError: any) {
              // Skip files that can't be tracked
              continue;
            }
          }
        }
      }

      if (commitCount === 0) {
        this.log('Nothing to commit - no changes detected');
        this.log('\nTip: Edit your tracked files and then commit to save a new version');
        return;
      }

      this.log('\nNext steps:');
      this.log('  Edit files and commit again to create new versions');
      this.log('  oops log      - View version history');
      this.log('  oops diff     - Compare with previous version');
    } catch (error: any) {
      this.error('Failed to create commit: ' + error.message);
      throw error;
    }
  }
}
