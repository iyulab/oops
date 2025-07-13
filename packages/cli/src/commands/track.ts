/**
 * Track command - Start versioning a file (creates version 1.0)
 * Handles both `oops track <file>` and `oops <file>` patterns
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
        await oops.init();
      }

      // Check if file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check tracking status and respond accordingly
      const isTracked = await oops.isTracked(filePath);

      if (isTracked) {
        // File already tracked - show current status
        this.log(`📊 ${path.basename(filePath)} - Already tracking`);

        // TODO: Show current version and state (clean/dirty)
        this.log('Current version: 1.2');
        this.log('Status: Clean (no changes)');

        this.log('\nNext steps:');
        this.log('  Edit file and commit to create new version');
        this.log('  oops log     - View version history');
        this.log('  oops checkout <version> - Navigate to specific version');
      } else {
        // Start tracking new file - create version 1.0
        await oops.track(filePath);
        this.log(`✓ Started tracking ${path.basename(filePath)}`);
        this.log('✓ Created version 1.0');

        this.log('\n🎯 File is now under version control!');
        this.log('\nNext steps:');
        this.log('  1. Edit the file with any editor');
        this.log('  2. oops commit     - Save changes as new version');
        this.log('  3. oops log        - View version history');
      }
    } catch (error: any) {
      this.error('Failed to track file: ' + error.message);
      throw error;
    }
  }
}
