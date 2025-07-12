/**
 * Diff command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class DiffCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length !== 1) {
      throw new Error('diff command requires exactly one file path');
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

      // Get diff
      const diffResult = await oops.diff(filePath);

      if (!diffResult.hasChanges) {
        this.log('No changes detected');
        return;
      }

      this.log(`Changes in ${filePath}:`);
      this.log(`  Lines added: ${diffResult.addedLines}`);
      this.log(`  Lines removed: ${diffResult.removedLines}`);
      this.log(`  Lines modified: ${diffResult.modifiedLines}`);
      this.log('');

      // Show basic diff (TODO: improve diff output)
      const trackingInfo = await oops.getTrackingInfo(filePath);

      // Read backup and current content
      const fs = await import('fs/promises');
      const backupContent = await fs.readFile(trackingInfo.backupPath, 'utf8');
      const currentContent = await fs.readFile(filePath, 'utf8');

      this.log('--- backup (original)');
      this.log('+++ current');
      this.log('');

      // Simple line-by-line comparison
      const backupLines = backupContent.split('\n');
      const currentLines = currentContent.split('\n');

      const maxLines = Math.max(backupLines.length, currentLines.length);
      for (let i = 0; i < maxLines; i++) {
        const backupLine = backupLines[i] || '';
        const currentLine = currentLines[i] || '';

        if (backupLine !== currentLine) {
          if (backupLines[i] !== undefined) {
            this.log(`- ${backupLine}`);
          }
          if (currentLines[i] !== undefined) {
            this.log(`+ ${currentLine}`);
          }
        }
      }

    } catch (error: any) {
      this.error('Failed to generate diff: ' + error.message);
      throw error;
    }
  }
}