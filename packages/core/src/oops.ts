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
  public async init(): Promise<void> {
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
  public async track(filePath: string, message?: string): Promise<FileTrackingInfo> {
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

  // Workspace management
  public async isWorkspaceHealthy(): Promise<boolean> {
    try {
      const info = await this.getWorkspaceInfo();
      return info.exists && info.isHealthy;
    } catch {
      return false;
    }
  }

  public async cleanWorkspace(): Promise<void> {
    await this.workspaceManager.clean();
  }

  public async getWorkspaceSize(): Promise<{ files: number; sizeBytes: number }> {
    const info = await this.getWorkspaceInfo();
    let totalSize = 0;

    // Calculate total size of all tracked files
    for (const file of info.trackedFiles) {
      try {
        const { FileSystem } = await import('./file-system');
        if (await FileSystem.exists(file.filePath)) {
          const fileInfo = await FileSystem.getFileInfo(file.filePath);
          totalSize += fileInfo.size;
        }
      } catch {
        // Ignore errors for individual files
      }
    }

    return {
      files: info.trackedFiles.length,
      sizeBytes: totalSize,
    };
  }

  public async getAllTrackedFiles(): Promise<FileTrackingInfo[]> {
    return await this.fileTracker.getAllTracked();
  }

  public async keepAll(): Promise<void> {
    const trackedFiles = await this.getAllTrackedFiles();
    for (const file of trackedFiles) {
      await this.keep(file.filePath);
    }
  }

  public async undoAll(): Promise<void> {
    const trackedFiles = await this.getAllTrackedFiles();
    for (const file of trackedFiles) {
      await this.undo(file.filePath);
    }
  }

  public async abortAll(): Promise<void> {
    const trackedFiles = await this.getAllTrackedFiles();
    for (const file of trackedFiles) {
      await this.abort(file.filePath);
    }
  }

  public async validateTrackedFiles(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const trackedFiles = await this.getAllTrackedFiles();

    for (const file of trackedFiles) {
      try {
        const { FileSystem } = await import('./file-system');
        if (!(await FileSystem.exists(file.filePath))) {
          errors.push(`Tracked file does not exist: ${file.filePath}`);
        }
        if (!(await FileSystem.exists(file.backupPath))) {
          errors.push(`Backup file does not exist: ${file.backupPath}`);
        }
      } catch (error: any) {
        errors.push(`Error validating ${file.filePath}: ${error.message}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  public async getVersion(): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const packagePath = path.join(__dirname, '../../package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      return packageJson.version;
    } catch {
      return '0.1.0';
    }
  }

  public static async createTempWorkspace(): Promise<Oops> {
    const { FileSystem } = await import('./file-system');
    const tempDir = await FileSystem.createTempDirectory('oops-temp-');
    return new Oops({}, tempDir);
  }

  public static async createLocalWorkspace(workspaceDir: string): Promise<Oops> {
    return new Oops({}, workspaceDir);
  }

  // Configuration
  public getConfig(): OopsConfig {
    return this.configManager.get();
  }

  public setConfig(key: string, value: any): void {
    this.configManager.set(key, value);
  }
}
