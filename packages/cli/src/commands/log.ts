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
          const versions = await oops.getVersionHistory(file.filePath);
          const currentVersion = await oops.getCurrentVersion(file.filePath);
          const hasChanges = await oops.hasVersionChanges(file.filePath);

          this.log(`\n📁 ${path.basename(file.filePath)}:`);

          if (options.graph || options.oneline) {
            // Show Git-style compact format with branching visualization
            if (hasChanges) {
              this.log(`* ${currentVersion}+ (HEAD, tag: ${currentVersion}+) Working changes`);
            } else {
              this.log(`* ${currentVersion} (HEAD, tag: ${currentVersion}) Current version`);
            }

            // Sort versions to show branching structure
            const sortedVersions = this.sortVersionsForDisplay(versions);

            for (const versionData of sortedVersions) {
              const version = versionData.version;
              const indent = versionData.indent;
              const isHead = version.version === currentVersion;
              const tag = isHead
                ? ` (HEAD, tag: ${version.version})`
                : ` (tag: ${version.version})`;

              // Create visual branching with indentation and lines
              const branchChar = indent === 0 ? '*' : '|\\';
              const indentStr = '  '.repeat(indent);

              this.log(
                `${indentStr}${branchChar} ${version.version}${tag} ${version.message || 'No message'}`
              );
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

  /**
   * Sort versions for display with branching visualization
   * Returns versions with indent information for proper tree display
   */
  private sortVersionsForDisplay(versions: any[]): Array<{ version: any; indent: number }> {
    const sortedVersions: Array<{ version: any; indent: number }> = [];

    // Separate sequential and branch versions
    const sequential = versions.filter(v => v.version.split('.').length === 2);
    const branches = versions.filter(v => v.version.split('.').length > 2);

    // Sort sequential versions
    sequential.sort((a, b) => this.compareVersions(b.version, a.version)); // Reverse chronological

    // Group branches by their base version
    const branchGroups: { [key: string]: any[] } = {};
    branches.forEach(branch => {
      const parts = branch.version.split('.');
      const baseVersion = `${parts[0]}.${parts[1]}`;
      if (!branchGroups[baseVersion]) {
        branchGroups[baseVersion] = [];
      }
      branchGroups[baseVersion].push(branch);
    });

    // Interleave sequential and branch versions
    for (const seqVersion of sequential) {
      sortedVersions.push({ version: seqVersion, indent: 0 });

      // Add branches for this version
      const versionBranches = branchGroups[seqVersion.version] || [];
      versionBranches
        .sort((a, b) => this.compareVersions(b.version, a.version))
        .forEach(branch => {
          const depth = branch.version.split('.').length - 2; // Depth beyond major.minor
          sortedVersions.push({ version: branch, indent: depth });
        });
    }

    return sortedVersions;
  }

  /**
   * Compare version strings (e.g., "1.2.1" vs "1.1.3")
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;

      if (aVal !== bVal) {
        return aVal - bVal;
      }
    }

    return 0;
  }
}
