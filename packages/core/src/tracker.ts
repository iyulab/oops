/**
 * File tracking management for Oops
 */

import * as path from 'path';
import { FileSystem } from './file-system';
import { FileTrackingInfo, FileStatusInfo } from './types';
import { FileNotFoundError, FileAlreadyTrackedError, FileNotTrackedError } from './errors';

export class FileTracker {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  public async isTracked(filePath: string): Promise<boolean> {
    const trackingPath = this.getTrackingPath(filePath);
    return await FileSystem.exists(trackingPath);
  }

  public async startTracking(filePath: string, message?: string): Promise<FileTrackingInfo> {
    if (!(await FileSystem.exists(filePath))) {
      throw new FileNotFoundError(filePath);
    }

    if (await this.isTracked(filePath)) {
      throw new FileAlreadyTrackedError(filePath);
    }

    const trackingPath = this.getTrackingPath(filePath);
    const backupPath = path.join(trackingPath, 'backup');

    // Create tracking directory
    await FileSystem.mkdir(trackingPath);

    // Create backup
    await FileSystem.copyFile(filePath, backupPath);

    // Create metadata
    const metadata = {
      originalPath: filePath,
      createdAt: new Date().toISOString(),
      message: message || 'Initial backup',
      checksum: 'TODO', // TODO: Implement checksum
    };

    const metadataPath = path.join(trackingPath, 'metadata.json');
    await FileSystem.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Update workspace state
    await this.updateWorkspaceState(filePath, 'add');

    const trackingInfo = {
      filePath,
      backupPath,
      workspacePath: trackingPath,
      isTracked: true,
      hasChanges: false,
      createdAt: new Date(),
      modifiedAt: new Date(),
      metadata,
    };

    return trackingInfo;
  }

  public async stopTracking(filePath: string): Promise<void> {
    if (!(await this.isTracked(filePath))) {
      throw new FileNotTrackedError(filePath);
    }

    // Remove from workspace state
    await this.updateWorkspaceState(filePath, 'remove');

    // Clean up tracking directory
    const trackingPath = this.getTrackingPath(filePath);
    if (await FileSystem.exists(trackingPath)) {
      // Remove the entire tracking directory and its contents
      await this.removeDirectory(trackingPath);
    }
  }

  public async getTrackingInfo(filePath: string): Promise<FileTrackingInfo> {
    if (!(await this.isTracked(filePath))) {
      throw new FileNotTrackedError(filePath);
    }

    const trackingPath = this.getTrackingPath(filePath);
    const backupPath = path.join(trackingPath, 'backup');
    const metadataPath = path.join(trackingPath, 'metadata.json');

    let metadata = {};
    try {
      const metadataContent = await FileSystem.readFile(metadataPath);
      metadata = JSON.parse(metadataContent);
    } catch {
      // If metadata can't be read, use empty object
    }

    // Check if file has changes compared to backup
    let hasChanges = false;
    try {
      if ((await FileSystem.exists(backupPath)) && (await FileSystem.exists(filePath))) {
        const backupContent = await FileSystem.readFile(backupPath);
        const currentContent = await FileSystem.readFile(filePath);
        hasChanges = backupContent !== currentContent;
      }
    } catch {
      // If we can't compare, assume no changes
    }

    return {
      filePath,
      backupPath,
      workspacePath: trackingPath,
      isTracked: true,
      hasChanges,
      createdAt: new Date(), // TODO: get from metadata
      modifiedAt: new Date(),
      metadata,
    };
  }

  public async getAllTracked(): Promise<FileTrackingInfo[]> {
    const statePath = path.join(this.workspacePath, 'state.json');

    try {
      const stateContent = await FileSystem.readFile(statePath);
      const state = JSON.parse(stateContent);
      return state.trackedFiles || [];
    } catch {
      return [];
    }
  }

  public async getStatus(filePath: string): Promise<FileStatusInfo> {
    const isTracked = await this.isTracked(filePath);
    const exists = await FileSystem.exists(filePath);

    if (!exists) {
      return {
        path: filePath,
        status: 'deleted',
        isTracked,
        hasBackup: isTracked,
        lastModified: new Date(),
      };
    }

    // TODO: Implement proper status detection
    return {
      path: filePath,
      status: 'clean',
      isTracked,
      hasBackup: isTracked,
      lastModified: new Date(),
    };
  }

  private getTrackingPath(filePath: string): string {
    // Create a hash-based path for the file
    const hash = this.hashPath(filePath);
    return path.join(this.workspacePath, 'files', hash);
  }

  private hashPath(filePath: string): string {
    // Simple hash implementation - TODO: use proper hash
    return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '_');
  }

  private async updateWorkspaceState(filePath: string, action: 'add' | 'remove'): Promise<void> {
    const statePath = path.join(this.workspacePath, 'state.json');

    let state = {
      trackedFiles: [] as any[],
      lastModified: new Date().toISOString(),
    };

    // Read existing state
    try {
      const stateContent = await FileSystem.readFile(statePath);
      state = JSON.parse(stateContent);
    } catch {
      // If state file doesn't exist or is invalid, use default
    }

    // Update tracked files list
    if (action === 'add') {
      const trackingInfo = {
        filePath: filePath,
        backupPath: path.join(this.getTrackingPath(filePath), 'backup'),
        workspacePath: this.getTrackingPath(filePath),
        isTracked: true,
        hasChanges: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
        metadata: {},
      };

      // Remove if already exists (shouldn't happen, but safety)
      state.trackedFiles = state.trackedFiles.filter((f: any) => f.filePath !== filePath);

      // Add new tracking info
      state.trackedFiles.push(trackingInfo);
    } else if (action === 'remove') {
      state.trackedFiles = state.trackedFiles.filter((f: any) => f.filePath !== filePath);
    }

    // Update modification time
    state.lastModified = new Date().toISOString();

    // Write updated state
    await FileSystem.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  private async removeDirectory(dirPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error: any) {
      // Ignore errors if directory doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
