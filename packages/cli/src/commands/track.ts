/**
 * Track command implementation - replaces init and begin
 * Handles `oops <file>` pattern with auto-initialization
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class TrackCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length !== 1) {
      throw new Error('Usage: oops <file>');
    }
  }

  public async execute(args: any[]): Promise<void> {
    try {
      const fileArgs = args.filter(arg => typeof arg === 'string');
      const filePath = path.resolve(fileArgs[0]);

      const oops = new Oops();

      // Auto-initialize workspace if needed
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        this.log('✨ Creating temporary workspace at: ' + workspaceInfo.path);
        await oops.initWorkspace();
      }

      // Check if file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
      } catch {
        this.error(`File not found: ${filePath}`);
        return;
      }

      // Check tracking status and respond accordingly
      const isTracked = await oops.isTracked(filePath);

      if (isTracked) {
        // File already tracked - show status
        this.log(`📊 ${path.basename(filePath)} - Already tracking`);

        // TODO: Check if file has changes and show appropriate message
        // For now, just show basic guidance
        this.log(`💡 Edit the file and run 'oops diff ${path.basename(filePath)}' to see changes`);
      } else {
        // Start tracking new file
        this.log(`📁 Backup created for ${path.basename(filePath)}`);
        await oops.begin(filePath);

        this.log(`🎯 Ready to edit safely!`);
        this.log(`💡 Edit with any editor, then run 'oops diff ${path.basename(filePath)}'`);
      }
    } catch (error: any) {
      this.error('Failed to track file: ' + error.message);
      throw error;
    }
  }
}
