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

      // Commit all files with changes using new version system
      this.log('Creating version checkpoint...');

      const commits = await oops.commitAll(message);

      if (commits.length === 0) {
        this.log('Nothing to commit - no changes detected');
        this.log('\nTip: Edit your tracked files and then commit to save a new version');
        return;
      }

      // Show results
      for (const commit of commits) {
        const fileName = path.basename(commit.filePath);
        this.log(`✓ Version ${commit.version} created for ${fileName}`);

        if (commit.message) {
          this.log(`  Message: ${commit.message}`);
        } else {
          this.log(`  Auto-generated commit`);
        }
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
