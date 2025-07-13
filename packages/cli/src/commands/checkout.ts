/**
 * Checkout command - Navigate to any version in history
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class CheckoutCommand extends BaseCommand {
  async validate(args: string[]): Promise<void> {
    if (args.length < 1) {
      throw new Error('checkout command requires a version argument');
    }
  }

  async execute(args: string[]): Promise<void> {
    const version = args[0];

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

      this.log(`Checking out version ${version}...`);

      // For Phase 2a, we support limited checkout functionality
      // Version '1.0' or 'HEAD' means restore to backup (original state)
      // In Phase 2b, we'll implement proper version navigation

      if (version === '1.0' || version === 'HEAD~1' || version === 'backup') {
        // Restore to original state (version 1.0)
        let restoredCount = 0;

        for (const file of trackedFiles) {
          const hasChanges = await oops.hasChanges(file.filePath);
          if (hasChanges) {
            // Temporarily restore without stopping tracking
            const trackingInfo = await oops.getTrackingInfo(file.filePath);
            const fs = await import('fs/promises');

            if (
              await require('fs')
                .promises.access(trackingInfo.backupPath)
                .then(() => true)
                .catch(() => false)
            ) {
              await fs.copyFile(trackingInfo.backupPath, file.filePath);
              restoredCount++;
            }
          }
        }

        this.log(`✓ Switched to version ${version}`);
        this.log(`  Restored ${restoredCount} file(s) to original state`);
      } else {
        // For other versions, show placeholder for Phase 2b
        this.log(`⚠\ufe0f  Version ${version} navigation not yet implemented`);
        this.log('Currently supported versions:');
        this.log('  1.0      - Original file state');
        this.log('  HEAD~1   - Original file state');
        this.log('  backup   - Original file state');
        this.log('');
        this.log('Advanced version navigation will be available in Phase 2b');
        return;
      }

      this.log('\nYou are now at version ' + version);
      this.log('\nNext steps:');
      this.log('  Edit files and commit to create a branch from this version');
      this.log('  oops log      - View version history');
      this.log('  oops diff     - Compare with current working version');
    } catch (error: any) {
      this.error(`Failed to checkout version ${version}: ` + error.message);
      throw error;
    }
  }
}
