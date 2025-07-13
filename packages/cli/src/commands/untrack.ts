/**
 * Untrack command - Stop tracking file (keep current state)
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class UntrackCommand extends BaseCommand {
  async validate(args: string[]): Promise<void> {
    if (args.length < 1) {
      throw new Error('untrack command requires a file argument');
    }
  }

  async execute(args: string[]): Promise<void> {
    const filePath = args[0];

    try {
      const oops = new Oops();

      // Check if file is under version control
      let isVersioned = false;
      try {
        await oops.getCurrentVersion(filePath);
        isVersioned = true;
      } catch {
        // Not versioned, check old tracking
        const isTracked = await oops.isTracked(filePath);
        if (!isTracked) {
          this.log(`File is not being tracked: ${filePath}`);
          this.log('Nothing to do.');
          return;
        }
      }

      this.log(`Stopping tracking for: ${filePath}`);

      // Check for unsaved changes
      let hasChanges = false;
      if (isVersioned) {
        hasChanges = await oops.hasVersionChanges(filePath);
      } else {
        hasChanges = await oops.hasChanges(filePath);
      }

      if (hasChanges) {
        this.log('\u26a0\ufe0f  File has unsaved changes');
        this.log('Current changes will be preserved');
      }

      // Stop tracking (version control or old-style)
      if (isVersioned) {
        await oops.untrackWithVersioning(filePath);
      } else {
        await oops.abort(filePath);
      }

      this.log('✓ File tracking stopped');
      this.log('✓ Version history removed');
      this.log('✓ File content preserved at current state');

      this.log('\n🎉 File is now untracked and can be edited normally.');
      this.log('\nTo start tracking again: oops ' + filePath);
    } catch (error: any) {
      this.error('Failed to untrack file: ' + error.message);
      throw error;
    }
  }
}
