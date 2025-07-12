/**
 * Git repository manager for per-file tracking
 */

import * as path from 'path';
import { GitWrapper } from './git';
import { FileSystem } from './file-system';
import { GitOperationError } from './errors';

export class GitManager {
  private gitInstances: Map<string, GitWrapper> = new Map();

  constructor(private workspaceRoot: string) {}

  /**
   * Get or create a Git wrapper for a specific file
   */
  public async getGitForFile(filePath: string): Promise<GitWrapper> {
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    
    if (!this.gitInstances.has(fileHash)) {
      const gitWrapper = new GitWrapper(gitRepoPath);
      this.gitInstances.set(fileHash, gitWrapper);
    }
    
    return this.gitInstances.get(fileHash)!;
  }

  /**
   * Initialize a Git repository for a file
   */
  public async initializeFileRepo(filePath: string): Promise<GitWrapper> {
    const gitWrapper = await this.getGitForFile(filePath);
    
    try {
      await gitWrapper.init();
      return gitWrapper;
    } catch (error: any) {
      throw new GitOperationError('initialize', { 
        error: error.message, 
        filePath, 
        workingDir: this.workspaceRoot 
      });
    }
  }

  /**
   * Create initial backup commit for a file
   */
  public async createInitialCommit(filePath: string, message?: string): Promise<void> {
    const gitWrapper = await this.getGitForFile(filePath);
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    const backupFilePath = path.join(gitRepoPath, 'backup');
    
    try {
      // Copy file to git repo
      await FileSystem.safeCopyFile(filePath, backupFilePath);
      
      // Add and commit
      await gitWrapper.add('backup');
      await gitWrapper.commit(message || `Initial backup of ${path.basename(filePath)}`);
    } catch (error: any) {
      throw new GitOperationError('initial-commit', {
        error: error.message,
        filePath,
        workingDir: gitRepoPath
      });
    }
  }

  /**
   * Update backup with current file state
   */
  public async updateBackup(filePath: string, message?: string): Promise<void> {
    const gitWrapper = await this.getGitForFile(filePath);
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    const backupFilePath = path.join(gitRepoPath, 'backup');
    
    try {
      // Copy current file to backup location
      await FileSystem.safeCopyFile(filePath, backupFilePath);
      
      // Check if there are changes
      const status = await gitWrapper.status();
      if (status.files.length > 0) {
        await gitWrapper.add('backup');
        await gitWrapper.commit(message || `Update backup of ${path.basename(filePath)}`);
      }
    } catch (error: any) {
      throw new GitOperationError('update-backup', {
        error: error.message,
        filePath,
        workingDir: gitRepoPath
      });
    }
  }

  /**
   * Restore file from backup
   */
  public async restoreFromBackup(filePath: string): Promise<void> {
    const gitWrapper = await this.getGitForFile(filePath);
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    const backupFilePath = path.join(gitRepoPath, 'backup');
    
    try {
      // Check if backup exists
      if (!await FileSystem.exists(backupFilePath)) {
        throw new GitOperationError('restore', {
          error: 'No backup found',
          filePath,
          workingDir: gitRepoPath
        });
      }
      
      // Restore from backup
      await FileSystem.safeCopyFile(backupFilePath, filePath);
    } catch (error: any) {
      throw new GitOperationError('restore', {
        error: error.message,
        filePath,
        workingDir: gitRepoPath
      });
    }
  }

  /**
   * Get diff between current file and backup
   */
  public async getDiff(filePath: string): Promise<string> {
    const gitWrapper = await this.getGitForFile(filePath);
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    const backupFilePath = path.join(gitRepoPath, 'backup');
    
    try {
      // Copy current file to temp location for diff
      const tempFilePath = path.join(gitRepoPath, 'current');
      await FileSystem.safeCopyFile(filePath, tempFilePath);
      
      // Get diff
      const diff = await gitWrapper.diff('backup');
      
      // Clean up temp file
      if (await FileSystem.exists(tempFilePath)) {
        await FileSystem.safeDeleteFile(tempFilePath);
      }
      
      return diff;
    } catch (error: any) {
      throw new GitOperationError('diff', {
        error: error.message,
        filePath,
        workingDir: gitRepoPath
      });
    }
  }

  /**
   * Check if file has backup
   */
  public async hasBackup(filePath: string): Promise<boolean> {
    try {
      const gitWrapper = await this.getGitForFile(filePath);
      return await gitWrapper.hasCommits();
    } catch {
      return false;
    }
  }

  /**
   * Check if file has changes compared to backup
   */
  public async hasChanges(filePath: string): Promise<boolean> {
    try {
      const fileHash = this.hashFilePath(filePath);
      const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
      const backupFilePath = path.join(gitRepoPath, 'backup');
      
      if (!await FileSystem.exists(backupFilePath)) {
        return true; // No backup means changes exist
      }
      
      const currentContent = await FileSystem.readFile(filePath);
      const backupContent = await FileSystem.readFile(backupFilePath);
      
      return currentContent !== backupContent;
    } catch {
      return false;
    }
  }

  /**
   * Clean up Git repository for a file
   */
  public async cleanupFileRepo(filePath: string): Promise<void> {
    const fileHash = this.hashFilePath(filePath);
    const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
    
    try {
      // Remove from cache
      this.gitInstances.delete(fileHash);
      
      // Remove directory
      if (await FileSystem.exists(gitRepoPath)) {
        await FileSystem.safeDeleteFile(gitRepoPath);
      }
    } catch (error: any) {
      throw new GitOperationError('cleanup', {
        error: error.message,
        filePath,
        workingDir: gitRepoPath
      });
    }
  }

  /**
   * Get repository health status
   */
  public async getRepoHealth(filePath: string): Promise<{
    exists: boolean;
    healthy: boolean;
    commitCount: number;
    hasBackup: boolean;
  }> {
    try {
      const gitWrapper = await this.getGitForFile(filePath);
      const fileHash = this.hashFilePath(filePath);
      const gitRepoPath = path.join(this.workspaceRoot, 'files', fileHash);
      const backupFilePath = path.join(gitRepoPath, 'backup');
      
      const exists = await FileSystem.exists(gitRepoPath);
      const healthy = exists && await gitWrapper.isHealthy();
      const commitCount = healthy ? await gitWrapper.getCommitCount() : 0;
      const hasBackup = await FileSystem.exists(backupFilePath);
      
      return {
        exists,
        healthy,
        commitCount,
        hasBackup
      };
    } catch {
      return {
        exists: false,
        healthy: false,
        commitCount: 0,
        hasBackup: false
      };
    }
  }

  /**
   * Hash file path to create unique repository directory
   */
  private hashFilePath(filePath: string): string {
    // Create a hash-based path for the file
    // Using base64 encoding and replacing problematic characters
    return Buffer.from(path.resolve(filePath))
      .toString('base64')
      .replace(/[/+=]/g, '_')
      .substring(0, 32); // Limit length
  }
}