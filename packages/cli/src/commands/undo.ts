/**
 * Undo command - Restore version and stop tracking
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class UndoCommand extends BaseCommand {
  async validate(args: string[]): Promise<void> {
    if (args.length < 1) {
      throw new Error('undo command requires a file argument');
    }
  }

  async execute(args: string[]): Promise<void> {
    const filePath = args[0];
    const version = args[1] || 'HEAD'; // Default to latest version (backup)

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
          this.log('Nothing to undo.');
          return;
        }
      }

      this.log(`Restoring ${filePath} to version ${version} and stopping tracking...`);

      // Check for unsaved changes
      let hasChanges = false;
      if (isVersioned) {
        hasChanges = await oops.hasVersionChanges(filePath);
      } else {
        hasChanges = await oops.hasChanges(filePath);
      }

      if (hasChanges) {
        this.log('\u26a0\ufe0f  This will discard current changes');
      }

      // Restore and stop tracking
      if (isVersioned) {
        await oops.undoWithVersioning(filePath, version);
      } else {
        await oops.undo(filePath);
      }

      this.log(`✓ File restored to version ${version}`);
      this.log('✓ File tracking stopped');
      this.log('✓ Version history removed');

      this.log('\n📜 File has been restored to its original state.');
      this.log('The file is now untracked and can be edited normally.');
      this.log('\nTo start tracking again: oops ' + filePath);
    } catch (error: any) {
      this.error('Failed to undo file: ' + error.message);
      throw error;
    }
  }
}
