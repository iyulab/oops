/**
 * Status command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class StatusCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    // Commander.js passes command options and the command object itself
    // We only need to validate if there are actual file arguments
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length > 0) {
      throw new Error('status command does not accept arguments');
    }
  }

  public async execute(_args: any[]): Promise<void> {
    try {
      const oops = new Oops();

      // Get workspace info
      const workspaceInfo = await oops.getWorkspaceInfo();

      if (!workspaceInfo.exists) {
        this.log('Workspace: Not initialized');
        this.log('No files being tracked');
        return;
      }

      if (!workspaceInfo.isHealthy) {
        this.log('⚠ Workspace exists but appears to be corrupted: ' + workspaceInfo.path);
        return;
      }

      this.log('Workspace: ' + workspaceInfo.path);

      // Display tracked files
      if (workspaceInfo.trackedFiles.length === 0) {
        this.log('No files being tracked');
      } else {
        this.log(`\nTracked files (${workspaceInfo.trackedFiles.length}):`);
        for (const file of workspaceInfo.trackedFiles) {
          try {
            const hasChanges = await oops.hasChanges(file.filePath);
            const status = hasChanges ? '📝 modified' : '✓ clean';
            this.log(`  ${status} ${file.filePath}`);
          } catch (error: any) {
            this.log(`  ❌ error ${file.filePath} (${error.message})`);
          }
        }
      }
    } catch (error: any) {
      this.error('Failed to get status: ' + error.message);
      throw error;
    }
  }
}
