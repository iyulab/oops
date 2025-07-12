/**
 * Undo command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class UndoCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length !== 1) {
      throw new Error('undo command requires exactly one file path');
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

      // Show what will be undone
      const hasChanges = await oops.hasChanges(filePath);
      if (hasChanges) {
        this.log(`Reverting changes in: ${filePath}`);
        this.log('⚠ Current changes will be lost');
      } else {
        this.log('No changes to undo. File matches backup.');
      }

      // Revert to backup and stop tracking
      await oops.undo(filePath);

      this.log('✓ File reverted to backup successfully');
      this.log('  File is no longer being tracked');

    } catch (error: any) {
      this.error('Failed to undo changes: ' + error.message);
      throw error;
    }
  }
}