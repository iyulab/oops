/**
 * Begin command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class BeginCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length !== 1) {
      throw new Error('begin command requires exactly one file path');
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

      // Check if file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
      } catch {
        this.error(`File not found: ${filePath}`);
        return;
      }

      // Check if already tracking
      const isTracked = await oops.isTracked(filePath);
      if (isTracked) {
        this.log(`⚠ File is already being tracked: ${filePath}`);
        return;
      }

      // Begin tracking
      this.log(`Starting to track: ${filePath}`);
      const trackingInfo = await oops.begin(filePath);

      this.log(`✓ File tracking started`);
      this.log(`  Original: ${trackingInfo.filePath}`);
      this.log(`  Backup: ${trackingInfo.backupPath}`);

    } catch (error: any) {
      this.error('Failed to begin tracking: ' + error.message);
      throw error;
    }
  }
}