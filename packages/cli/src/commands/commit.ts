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

      // Get all tracked files
      const trackedFiles = await oops.getAllTrackedFiles();
      if (trackedFiles.length === 0) {
        throw new Error('No files being tracked. Start tracking a file first with: oops <file>');
      }

      // Check for changes in tracked files
      let hasAnyChanges = false;
      const changedFiles: string[] = [];

      for (const file of trackedFiles) {
        const hasChanges = await oops.hasChanges(file.filePath);
        if (hasChanges) {
          hasAnyChanges = true;
          changedFiles.push(path.basename(file.filePath));
        }
      }

      if (!hasAnyChanges) {
        this.log('Nothing to commit - no changes detected');
        this.log('\nTip: Edit your tracked files and then commit to save a new version');
        return;
      }

      this.log('Creating version checkpoint...');

      // For now, we use the backup/restore model as a basis for versioning
      // In Phase 2b, we'll implement proper version numbering
      // Currently, this creates a new "backup state" which represents a commit

      const versionNumber = '1.1'; // TODO: Implement proper version tracking in Phase 2b

      // Apply changes (keep) to create the "commit"
      for (const file of trackedFiles) {
        const hasChanges = await oops.hasChanges(file.filePath);
        if (hasChanges) {
          // Create a "commit" by applying changes
          await oops.keep(file.filePath);
          // Immediately start tracking again for next version
          await oops.track(file.filePath);
        }
      }

      this.log(`✓ Version ${versionNumber} created successfully`);
      this.log(`  Modified files: ${changedFiles.join(', ')}`);

      if (message) {
        this.log(`  Message: ${message}`);
      } else {
        this.log(`  Auto-generated: Modified ${changedFiles.length} file(s)`);
      }

      this.log('\nNext steps:');
      this.log('  Edit files and commit again to create version 1.2');
      this.log('  oops log      - View version history');
      this.log('  oops diff     - Compare with previous version');
    } catch (error: any) {
      this.error('Failed to create commit: ' + error.message);
      throw error;
    }
  }
}
