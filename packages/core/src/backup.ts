/**
 * Backup management for Oops
 */

import * as path from 'path';
import { FileSystem } from './file-system';
import { GitWrapper } from './git';
import { BackupInfo } from './types';
import { FileNotFoundError } from './errors';

export class BackupManager {
  private gitWrapper: GitWrapper;

  constructor(private workspacePath: string) {
    this.gitWrapper = new GitWrapper(workspacePath);
  }

  public async createBackup(filePath: string, message?: string): Promise<BackupInfo> {
    if (!(await FileSystem.exists(filePath))) {
      throw new FileNotFoundError(filePath);
    }

    const backupPath = path.join(this.workspacePath, 'backup');

    // Copy file to backup location
    await FileSystem.copyFile(filePath, backupPath);

    // Initialize git if needed
    if (!(await FileSystem.exists(path.join(this.workspacePath, '.git')))) {
      await this.gitWrapper.init();
    }

    // Add and commit backup
    await this.gitWrapper.add('backup');
    await this.gitWrapper.commit(message || 'Initial backup');

    return {
      originalPath: filePath,
      backupPath,
      timestamp: new Date(),
      checksum: 'TODO', // TODO: Implement checksum
      metadata: {
        message: message || 'Initial backup',
      },
    };
  }

  public async restoreBackup(backupInfo: BackupInfo): Promise<void> {
    if (!(await FileSystem.exists(backupInfo.backupPath))) {
      throw new FileNotFoundError(backupInfo.backupPath);
    }

    // Restore file from backup
    await FileSystem.copyFile(backupInfo.backupPath, backupInfo.originalPath);
  }

  public async hasBackup(_filePath: string): Promise<boolean> {
    const backupPath = path.join(this.workspacePath, 'backup');
    return await FileSystem.exists(backupPath);
  }

  public async getBackupInfo(_filePath: string): Promise<BackupInfo | null> {
    const backupPath = path.join(this.workspacePath, 'backup');

    if (!(await FileSystem.exists(backupPath))) {
      return null;
    }

    // TODO: Implement proper backup info retrieval
    return {
      originalPath: _filePath,
      backupPath,
      timestamp: new Date(),
      checksum: 'TODO',
      metadata: {},
    };
  }
}
