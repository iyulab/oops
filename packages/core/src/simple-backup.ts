/**
 * Simple Backup System - Core Purpose Implementation
 *
 * Purpose: Safe text file editing with automatic backup and simple undo
 * Features: One backup per file, atomic operations, simple workflow
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystem } from './file-system';

export interface TrackedFileInfo {
  filePath: string;
  hasChanges: boolean;
  backupPath: string;
  trackedAt: Date;
}

export interface BackupStatus {
  trackedFiles: TrackedFileInfo[];
  totalFiles: number;
}

interface StateFileInfo {
  filePath: string;
  backupPath: string;
  trackedAt: string;
}

interface BackupState {
  files: StateFileInfo[];
}

export class SimpleBackup {
  private workspacePath: string;
  private backupDir: string;
  private stateFile: string;

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath || path.join(process.cwd(), '.oops');
    this.backupDir = path.join(this.workspacePath, 'backups');
    this.stateFile = path.join(this.workspacePath, 'simple-state.json');
  }

  /**
   * Start tracking a file with automatic backup
   * Equivalent to: oops <file>
   */
  public async startTracking(filePath: string): Promise<void> {
    // Validate file exists
    if (!(await FileSystem.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check if already tracked
    if (await this.isTracked(filePath)) {
      return; // Already tracking, no-op
    }

    // Ensure workspace and backup directories exist
    await this.ensureDirectories();

    // Create backup
    const backupPath = await this.createBackup(filePath);

    // Add to tracking state
    await this.addToState(filePath, backupPath);
  }

  /**
   * Check if a file is currently being tracked
   */
  public async isTracked(filePath: string): Promise<boolean> {
    try {
      const state = await this.loadState();
      return state.files.some((f: StateFileInfo) => f.filePath === path.resolve(filePath));
    } catch {
      return false;
    }
  }

  /**
   * Check if backup exists for a file
   */
  public async hasBackup(filePath: string): Promise<boolean> {
    try {
      const state = await this.loadState();
      const fileInfo = state.files.find(
        (f: StateFileInfo) => f.filePath === path.resolve(filePath)
      );
      return fileInfo ? await FileSystem.exists(fileInfo.backupPath) : false;
    } catch {
      return false;
    }
  }

  /**
   * Get backup content for a file
   */
  public async getBackupContent(filePath: string): Promise<string> {
    const state = await this.loadState();
    const fileInfo = state.files.find((f: StateFileInfo) => f.filePath === path.resolve(filePath));

    if (!fileInfo) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    return await FileSystem.readFile(fileInfo.backupPath);
  }

  /**
   * Check if file has changes compared to backup
   */
  public async hasChanges(filePath: string): Promise<boolean> {
    if (!(await this.isTracked(filePath))) {
      return false;
    }

    try {
      const currentContent = await FileSystem.readFile(filePath);
      const backupContent = await this.getBackupContent(filePath);
      return currentContent !== backupContent;
    } catch {
      return true; // If we can't read, assume changes
    }
  }

  /**
   * Keep changes and stop tracking
   * Equivalent to: oops keep <file>
   */
  public async keep(filePath: string): Promise<void> {
    if (!(await this.isTracked(filePath))) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    // Remove from tracking state and cleanup backup
    await this.removeFromState(filePath);
  }

  /**
   * Undo changes and restore from backup
   * Equivalent to: oops undo <file>
   */
  public async undo(filePath: string): Promise<void> {
    if (!(await this.isTracked(filePath))) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    // Restore from backup
    const backupContent = await this.getBackupContent(filePath);
    await FileSystem.writeFile(filePath, backupContent);

    // Remove from tracking state and cleanup backup
    await this.removeFromState(filePath);
  }

  /**
   * Get status of all tracked files
   * Equivalent to: oops status
   */
  public async getStatus(): Promise<BackupStatus> {
    try {
      const state = await this.loadState();
      const trackedFiles: TrackedFileInfo[] = [];

      for (const fileInfo of state.files) {
        try {
          const hasChanges = await this.hasChanges(fileInfo.filePath);
          trackedFiles.push({
            filePath: fileInfo.filePath,
            hasChanges,
            backupPath: fileInfo.backupPath,
            trackedAt: new Date(fileInfo.trackedAt),
          });
        } catch {
          // Skip files that can't be read
        }
      }

      return {
        trackedFiles,
        totalFiles: trackedFiles.length,
      };
    } catch {
      return {
        trackedFiles: [],
        totalFiles: 0,
      };
    }
  }

  /**
   * Get diff between backup and current file
   * Equivalent to: oops diff <file>
   */
  public async getDiff(filePath: string): Promise<string> {
    if (!(await this.isTracked(filePath))) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    const currentContent = await FileSystem.readFile(filePath);
    const backupContent = await this.getBackupContent(filePath);

    return this.generateSimpleDiff(backupContent, currentContent, filePath);
  }

  // Private helper methods

  private async ensureDirectories(): Promise<void> {
    await FileSystem.mkdir(this.workspacePath);
    await FileSystem.mkdir(this.backupDir);
  }

  private async createBackup(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const backupPath = path.join(this.backupDir, `${fileName}.${timestamp}.bak`);

    await FileSystem.copyFile(filePath, backupPath);
    return backupPath;
  }

  private async addToState(filePath: string, backupPath: string): Promise<void> {
    const state = await this.loadState();

    state.files.push({
      filePath: path.resolve(filePath),
      backupPath,
      trackedAt: new Date().toISOString(),
    });

    await this.saveState(state);
  }

  private async removeFromState(filePath: string): Promise<void> {
    const state = await this.loadState();
    const fileInfo = state.files.find((f: StateFileInfo) => f.filePath === path.resolve(filePath));

    if (fileInfo) {
      // Remove backup file
      try {
        await fs.unlink(fileInfo.backupPath);
      } catch {
        // Ignore if backup file doesn't exist
      }

      // Remove from state
      state.files = state.files.filter((f: StateFileInfo) => f.filePath !== path.resolve(filePath));
      await this.saveState(state);
    }
  }

  private async loadState(): Promise<BackupState> {
    try {
      const content = await FileSystem.readFile(this.stateFile);
      return JSON.parse(content);
    } catch {
      return { files: [] };
    }
  }

  private async saveState(state: BackupState): Promise<void> {
    await FileSystem.writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }

  private generateSimpleDiff(
    originalContent: string,
    currentContent: string,
    filePath: string
  ): string {
    const originalLines = originalContent.split('\n');
    const currentLines = currentContent.split('\n');

    let diff = `--- ${filePath} (backup)\n`;
    diff += `+++ ${filePath} (current)\n`;

    const maxLines = Math.max(originalLines.length, currentLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const currentLine = currentLines[i];

      if (originalLine !== currentLine) {
        if (originalLine !== undefined) {
          diff += `-${originalLine}\n`;
        }
        if (currentLine !== undefined) {
          diff += `+${currentLine}\n`;
        }
      }
    }

    return diff;
  }
}
