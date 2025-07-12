/**
 * Main Oops SDK class
 */

import { ConfigManager } from './config';
import { WorkspaceManager } from './workspace';
import { FileTracker } from './tracker';
import { BackupManager } from './backup';
import { DiffProcessor } from './diff';
import { OopsConfig, FileTrackingInfo, DiffResult, WorkspaceInfo } from './types';

export class Oops {
  private configManager: ConfigManager;
  private workspaceManager: WorkspaceManager;
  private fileTracker: FileTracker;
  private backupManager: BackupManager;
  private diffProcessor: DiffProcessor;

  constructor(config: Partial<OopsConfig> = {}, workspacePath?: string) {
    this.configManager = new ConfigManager(config);
    this.workspaceManager = new WorkspaceManager(workspacePath);
    this.fileTracker = new FileTracker(this.workspaceManager.getWorkspacePath());
    this.backupManager = new BackupManager(this.workspaceManager.getWorkspacePath());
    this.diffProcessor = new DiffProcessor();
  }

  // Workspace operations
  public async initWorkspace(): Promise<void> {
    await this.workspaceManager.init();
  }

  public async getWorkspaceInfo(): Promise<WorkspaceInfo> {
    try {
      return await this.workspaceManager.getInfo();
    } catch {
      // If workspace doesn't exist, return basic info
      return {
        path: this.workspaceManager.getWorkspacePath(),
        type: 'local',
        exists: false,
        isHealthy: false,
        trackedFiles: [],
        createdAt: new Date(),
      };
    }
  }

  // File tracking operations
  public async begin(filePath: string, message?: string): Promise<FileTrackingInfo> {
    return await this.fileTracker.startTracking(filePath, message);
  }

  public async isTracked(filePath: string): Promise<boolean> {
    return await this.fileTracker.isTracked(filePath);
  }

  public async getTrackingInfo(filePath: string): Promise<FileTrackingInfo> {
    return await this.fileTracker.getTrackingInfo(filePath);
  }

  // Diff operations
  public async diff(filePath: string): Promise<DiffResult> {
    const trackingInfo = await this.fileTracker.getTrackingInfo(filePath);
    return await this.diffProcessor.generateDiff(trackingInfo.backupPath, filePath);
  }

  public async hasChanges(filePath: string): Promise<boolean> {
    try {
      const trackingInfo = await this.fileTracker.getTrackingInfo(filePath);
      return await this.diffProcessor.hasChanges(trackingInfo.backupPath, filePath);
    } catch {
      // If we can't get tracking info, assume no changes
      return false;
    }
  }

  // Backup operations
  public async keep(filePath: string): Promise<void> {
    // Verify file is being tracked
    if (!(await this.isTracked(filePath))) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    // Apply changes by simply stopping tracking
    // The current file already contains the desired changes
    await this.fileTracker.stopTracking(filePath);
  }

  public async undo(filePath: string): Promise<void> {
    // Verify file is being tracked
    if (!(await this.isTracked(filePath))) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    // Get tracking info to find backup path
    const trackingInfo = await this.fileTracker.getTrackingInfo(filePath);

    // Restore file from backup
    const { FileSystem } = await import('./file-system');
    if (await FileSystem.exists(trackingInfo.backupPath)) {
      await FileSystem.copyFile(trackingInfo.backupPath, filePath);
    } else {
      throw new Error(`Backup not found: ${trackingInfo.backupPath}`);
    }

    // Stop tracking
    await this.fileTracker.stopTracking(filePath);
  }

  public async abort(filePath: string): Promise<void> {
    await this.fileTracker.stopTracking(filePath);
  }

  // Configuration
  public getConfig(): OopsConfig {
    return this.configManager.get();
  }

  public setConfig(key: string, value: any): void {
    this.configManager.set(key, value);
  }
}
