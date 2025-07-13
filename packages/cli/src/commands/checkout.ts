/**
 * Checkout command - Navigate to any version in history
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

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

      // Get all tracked files to find versioned files
      const trackedFiles = await oops.getAllTrackedFiles();
      if (trackedFiles.length === 0) {
        throw new Error('No files being tracked. Start tracking a file first with: oops <file>');
      }

      this.log(`Checking out version ${version}...`);

      let checkoutCount = 0;
      const errors: string[] = [];

      // Try to checkout version for each tracked file
      for (const file of trackedFiles) {
        try {
          await oops.checkoutVersion(file.filePath, version);
          checkoutCount++;
        } catch (error: any) {
          errors.push(`${path.basename(file.filePath)}: ${error.message}`);
        }
      }

      if (checkoutCount > 0) {
        this.log(`✓ Switched to version ${version}`);
        this.log(`  Updated ${checkoutCount} file(s)`);
      }

      if (errors.length > 0) {
        this.log('\n⚠️  Some files could not be checked out:');
        errors.forEach(error => this.log(`  ${error}`));
      }

      if (checkoutCount === 0) {
        this.log(`⚠️  Version ${version} not found for any tracked files`);
        this.log('\nTip: Use "oops log" to see available versions');
        return;
      }

      this.log('\nYou are now at version ' + version);
      this.log('\nNext steps:');
      this.log('  Edit files and commit to create a branch from this version');
      this.log('  oops log      - View version history');
      this.log('  oops diff     - Compare with other versions');
    } catch (error: any) {
      this.error(`Failed to checkout version ${version}: ` + error.message);
      throw error;
    }
  }
}
