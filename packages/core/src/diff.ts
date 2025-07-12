/**
 * Diff processing for Oops
 */

import { FileSystem } from './file-system';
import { DiffResult } from './types';
import { FileNotFoundError } from './errors';

export class DiffProcessor {
  public async generateDiff(originalPath: string, modifiedPath: string): Promise<DiffResult> {
    if (!(await FileSystem.exists(originalPath))) {
      throw new FileNotFoundError(originalPath);
    }

    if (!(await FileSystem.exists(modifiedPath))) {
      throw new FileNotFoundError(modifiedPath);
    }

    const originalContent = await FileSystem.readFile(originalPath);
    const modifiedContent = await FileSystem.readFile(modifiedPath);

    // Simple diff implementation - TODO: use proper diff algorithm
    const hasChanges = originalContent !== modifiedContent;

    if (!hasChanges) {
      return {
        hasChanges: false,
        addedLines: 0,
        removedLines: 0,
        modifiedLines: 0,
        diff: '',
      };
    }

    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');

    // Very basic diff counting - TODO: implement proper diff
    let addedLines = Math.max(0, modifiedLines.length - originalLines.length);
    const removedLines = Math.max(0, originalLines.length - modifiedLines.length);
    let modifiedLineCount = 0;

    // Count modified lines (lines that exist in both but are different)
    const minLength = Math.min(originalLines.length, modifiedLines.length);
    for (let i = 0; i < minLength; i++) {
      if (originalLines[i] !== modifiedLines[i]) {
        modifiedLineCount++;
      }
    }

    // If content changed but line count is same, treat as added lines
    if (addedLines === 0 && removedLines === 0 && modifiedLineCount > 0) {
      addedLines = modifiedLineCount;
    }

    return {
      hasChanges: true,
      addedLines,
      removedLines,
      modifiedLines: modifiedLineCount,
      diff: `--- ${originalPath}\n+++ ${modifiedPath}\n@@ Lines changed @@\n`, // TODO: implement proper diff format
    };
  }

  public async hasChanges(originalPath: string, modifiedPath: string): Promise<boolean> {
    const result = await this.generateDiff(originalPath, modifiedPath);
    return result.hasChanges;
  }

  public async getStats(
    originalPath: string,
    modifiedPath: string
  ): Promise<{ added: number; removed: number; modified: number }> {
    const result = await this.generateDiff(originalPath, modifiedPath);
    return {
      added: result.addedLines,
      removed: result.removedLines,
      modified: result.modifiedLines,
    };
  }
}
