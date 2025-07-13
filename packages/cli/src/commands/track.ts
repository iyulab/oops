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

      // Check if file is already under version control
      let currentVersion: string;
      let hasChanges: boolean;

      try {
        currentVersion = await oops.getCurrentVersion(filePath);
        hasChanges = await oops.hasVersionChanges(filePath);

        // File already tracked - show current status
        this.log(`📊 ${path.basename(filePath)} - Already tracking`);
        this.log(`Current version: ${currentVersion}`);
        this.log(`Status: ${hasChanges ? 'Modified (has changes)' : 'Clean (no changes)'}`);

        this.log('\nNext steps:');
        if (hasChanges) {
          this.log('  oops commit     - Save changes as new version');
        } else {
          this.log('  Edit file and commit to create new version');
        }
        this.log('  oops log        - View version history');
        this.log('  oops checkout <version> - Navigate to specific version');
      } catch {
        // Start tracking new file - create version 1.0
        const versionInfo = await oops.trackWithVersioning(filePath, 'Initial version');
        this.log(`✓ Started tracking ${path.basename(filePath)}`);
        this.log(`✓ Created version ${versionInfo.version}`);

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
