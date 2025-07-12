/**
 * Keep command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class KeepCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length !== 1) {
      throw new Error('keep command requires exactly one file path');
    }
  }

  public async execute(args: any[]): Promise<void> {
    try {
      const fileArgs = args.filter(arg => typeof arg === 'string');
      const filePath = path.resolve(fileArgs[0]);

      const oops = new Oops();

      // Check if workspace exists
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        this.error('No workspace found. Run "oops init" to initialize a workspace.');
        return;
      }

      // Check if file is being tracked
      const isTracked = await oops.isTracked(filePath);
      if (!isTracked) {
        this.error(`File is not being tracked: ${filePath}`);
        this.log('Run "oops begin <file>" to start tracking.');
        return;
      }

      // Check if there are changes to keep
      const hasChanges = await oops.hasChanges(filePath);
      if (!hasChanges) {
        this.log('No changes to keep. File matches backup.');
        // Still stop tracking even if no changes
      }

      // Apply changes and stop tracking
      this.log(`Applying changes and stopping tracking: ${filePath}`);
      await oops.keep(filePath);

      this.log('✓ Changes applied successfully');
      this.log('  File is no longer being tracked');

    } catch (error: any) {
      this.error('Failed to keep changes: ' + error.message);
      throw error;
    }
  }
}