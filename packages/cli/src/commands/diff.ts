/**
 * Diff command implementation - Git-style version comparison
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class DiffCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    // Version argument is optional - if not provided, compare with previous version
    const fileArgs = args.filter(arg => typeof arg === 'string' && !arg.startsWith('--'));
    if (fileArgs.length > 1) {
      throw new Error('diff command takes at most one version argument');
    }
  }

  public async execute(args: any[]): Promise<void> {
    try {
      const fileArgs = args.filter(arg => typeof arg === 'string' && !arg.startsWith('--'));
      const version = fileArgs[0] || 'HEAD~1'; // Default to previous version
      const toolOption = this.parseToolOption(args);

      const oops = new Oops();

      // Get workspace info
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        throw new Error('No workspace found. Start tracking a file first with: oops <file>');
      }

      // Get all tracked files
      const trackedFiles = await oops.getAllTrackedFiles();
      if (trackedFiles.length === 0) {
        throw new Error('No files being tracked. Start tracking a file first with: oops <file>');
      }

      this.log(`Comparing with version: ${version}`);

      if (toolOption) {
        this.log(`Using external tool: ${toolOption}`);
      }

      // Show diff for each tracked file that has changes
      let hasAnyDiff = false;

      for (const file of trackedFiles) {
        const hasChanges = await oops.hasChanges(file.filePath);

        if (hasChanges) {
          hasAnyDiff = true;
          const diffResult = await oops.diff(file.filePath);

          // Show Git-style diff header
          this.log(`\ndiff --git a/${file.filePath} b/${file.filePath}`);
          this.log(`index backup..current 100644`);
          this.log(`--- a/${file.filePath}`);
          this.log(`+++ b/${file.filePath}`);

          // Show the actual diff content
          if (diffResult.diff) {
            this.log(diffResult.diff);
          } else {
            this.log(`@@ -1,1 +1,1 @@`);
            this.log(`-[previous content]`);
            this.log(`+[current content]`);
          }

          this.log(
            `\n${diffResult.addedLines} insertions(+), ${diffResult.removedLines} deletions(-)`
          );
        }
      }

      if (!hasAnyDiff) {
        this.log('No changes detected in tracked files');
        this.log('\nTip: Edit your files and run diff again to see changes');
      }

      if (toolOption && hasAnyDiff) {
        this.log(`\nNote: External diff tool integration not yet implemented`);
        this.log(`Tool: ${toolOption}`);
        // TODO: Phase 3b - Launch external diff tool
      }
    } catch (error: any) {
      this.error('Failed to generate diff: ' + error.message);
      throw error;
    }
  }

  private parseToolOption(args: string[]): string | null {
    const toolIndex = args.findIndex(arg => arg === '--tool');
    if (toolIndex >= 0 && toolIndex + 1 < args.length) {
      return args[toolIndex + 1];
    }
    return null;
  }
}
