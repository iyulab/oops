/**
 * Log command - Show visual version timeline
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as path from 'path';

export class LogCommand extends BaseCommand {
  async validate(_args: string[]): Promise<void> {
    // No specific validation needed for log
  }

  async execute(args: string[]): Promise<void> {
    const options = this.parseOptions(args);

    try {
      const oops = new Oops();

      // Get workspace info
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        this.log('No workspace found. Start tracking a file first with: oops <file>');
        return;
      }

      // Get all tracked files
      const trackedFiles = await oops.getAllTrackedFiles();
      if (trackedFiles.length === 0) {
        this.log('No files being tracked. Start tracking a file first with: oops <file>');
        return;
      }

      this.log('Version history:');
      this.log('');

      // Show version history for each tracked file
      for (const file of trackedFiles) {
        try {
          const versions = await oops.getVersions(file.filePath);
          const currentVersion = await oops.getCurrentVersion(file.filePath);
          const hasChanges = await oops.hasVersionChanges(file.filePath);

          this.log(`\n📁 ${path.basename(file.filePath)}:`);

          if (options.graph || options.oneline) {
            // Show Git-style compact format
            if (hasChanges) {
              this.log(`* ${currentVersion}+ (HEAD, tag: ${currentVersion}+) Working changes`);
            } else {
              this.log(`* ${currentVersion} (HEAD, tag: ${currentVersion}) Current version`);
            }

            for (const version of versions.reverse()) {
              const isHead = version.version === currentVersion;
              const tag = isHead
                ? ` (HEAD, tag: ${version.version})`
                : ` (tag: ${version.version})`;
              this.log(`* ${version.version}${tag} ${version.message || 'No message'}`);
            }
          } else {
            // Show detailed format
            if (hasChanges) {
              this.log(`version ${currentVersion}+ (HEAD -> modified)`);
              this.log('Date: ' + new Date().toISOString());
              this.log('');
              this.log('    Uncommitted changes');
              this.log('');
            }

            for (const version of versions.reverse()) {
              const marker = version.version === currentVersion ? ' (current)' : '';
              this.log(`version ${version.version}${marker}`);
              this.log('Date: ' + version.timestamp.toISOString());
              this.log('');
              this.log(`    ${version.message || 'No message'}`);
              this.log('');
            }
          }
        } catch (error) {
          // If version history doesn't exist, show fallback
          this.log(`\n📁 ${path.basename(file.filePath)}: Not under version control`);
        }
      }

      this.log('\nTip: Use "oops commit" to create new versions');
    } catch (error: any) {
      this.error('Failed to show log: ' + error.message);
      throw error;
    }
  }

  private parseOptions(args: string[]) {
    return {
      graph: args.includes('--graph'),
      oneline: args.includes('--oneline'),
      decorate: args.includes('--decorate'),
    };
  }
}
