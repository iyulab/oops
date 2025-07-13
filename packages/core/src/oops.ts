/**
 * Main Oops SDK class
 */

import { ConfigManager } from './config';
import { WorkspaceManager } from './workspace';
import { FileTracker } from './tracker';
import { BackupManager } from './backup';
import { DiffProcessor } from './diff';
import { VersionManager } from './version';
import {
  SimpleVersionManager,
  VersionInfo as SimpleVersionInfo,
  CommitResult,
} from './simple-version';
import { OopsConfig, FileTrackingInfo, DiffResult, WorkspaceInfo, VersionInfo } from './types';

export class Oops {
  private configManager: ConfigManager;
  private workspaceManager: WorkspaceManager;
  private fileTracker: FileTracker;
  private backupManager: BackupManager;
  private diffProcessor: DiffProcessor;
  private versionManager: VersionManager;
  private simpleVersionManagers: Map<string, SimpleVersionManager> = new Map();

  constructor(config: Partial<OopsConfig> = {}, workspacePath?: string) {
    this.configManager = new ConfigManager(config);
    this.workspaceManager = new WorkspaceManager(workspacePath);
    this.fileTracker = new FileTracker(this.workspaceManager.getWorkspacePath());
    this.backupManager = new BackupManager(this.workspaceManager.getWorkspacePath());
    this.diffProcessor = new DiffProcessor();
    this.versionManager = new VersionManager(this.workspaceManager.getWorkspacePath());
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
    // Initialize workspace if needed
    if (!(await this.workspaceManager.exists())) {
      await this.init();
    }

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

  // Simple Version System Methods (for TDD tests)
  public async trackWithVersion(filePath: string, message?: string): Promise<SimpleVersionInfo> {
    // Initialize workspace if needed
    if (!(await this.workspaceManager.exists())) {
      await this.init();
    }

    // Get or create simple version manager for this file
    const versionManager = this.getSimpleVersionManager(filePath);
    await versionManager.initialize();

    // Create initial version
    return await versionManager.createInitialVersion(message || 'Initial version');
  }

  public async commitVersion(filePath: string, message: string): Promise<CommitResult> {
    const versionManager = this.getSimpleVersionManager(filePath);
    return await versionManager.commitVersion(message);
  }

  public async getVersionHistory(filePath: string): Promise<SimpleVersionInfo[]> {
    const versionManager = this.getSimpleVersionManager(filePath);
    const versions = await versionManager.getAllVersions();

    if (versions.length === 0) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    return versions;
  }

  public async checkoutVersion(filePath: string, version: number): Promise<void> {
    const versionManager = this.getSimpleVersionManager(filePath);
    const versions = await versionManager.getAllVersions();

    if (versions.length === 0) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    await versionManager.checkoutVersion(version);
  }

  public async getCurrentVersion(filePath: string): Promise<number> {
    const versionManager = this.getSimpleVersionManager(filePath);
    const versions = await versionManager.getAllVersions();

    if (versions.length === 0) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    const currentVersion = await versionManager.getCurrentVersion();
    return currentVersion || 1;
  }

  public async getVersionDiff(
    filePath: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<string> {
    const versionManager = this.getSimpleVersionManager(filePath);
    const versions = await versionManager.getAllVersions();

    if (versions.length === 0) {
      throw new Error(`File is not being tracked: ${filePath}`);
    }

    return await versionManager.getDiff(fromVersion, toVersion);
  }

  public async hasVersionChanges(filePath: string): Promise<boolean> {
    try {
      const versionManager = this.getSimpleVersionManager(filePath);
      return await versionManager.hasChanges();
    } catch {
      return false;
    }
  }

  public getSimpleVersionManager(filePath: string): SimpleVersionManager {
    if (!this.simpleVersionManagers.has(filePath)) {
      const versionManager = new SimpleVersionManager(
        this.workspaceManager.getWorkspacePath(),
        filePath
      );
      this.simpleVersionManagers.set(filePath, versionManager);
    }
    return this.simpleVersionManagers.get(filePath)!;
  }

  // Version management operations (legacy)
  public async trackWithVersioning(filePath: string, message?: string): Promise<VersionInfo> {
    // Initialize workspace if needed
    if (!(await this.workspaceManager.exists())) {
      await this.init();
    }

    // Check if already versioned
    try {
      const history = await this.versionManager.getVersionHistory(filePath);
      return history.versions[history.versions.length - 1]; // Return latest version
    } catch {
      // Not versioned yet, initialize
      return await this.versionManager.initializeVersioning(filePath, message);
    }
  }

  public async commit(filePath: string, message?: string): Promise<VersionInfo> {
    return await this.versionManager.createCommit(filePath, message);
  }

  public async commitAll(message?: string): Promise<VersionInfo[]> {
    const trackedFiles = await this.getAllTrackedFiles();
    const commits: VersionInfo[] = [];
    const errors: string[] = [];

    for (const file of trackedFiles) {
      try {
        if (await this.hasVersionChanges(file.filePath)) {
          const commit = await this.versionManager.createCommit(file.filePath, message);
          commits.push(commit);
        }
      } catch (error: any) {
        // If version system fails, try to initialize versioning first
        try {
          await this.trackWithVersioning(file.filePath, 'Initial version');
          if (await this.hasVersionChanges(file.filePath)) {
            const commit = await this.versionManager.createCommit(file.filePath, message);
            commits.push(commit);
          }
        } catch (initError: any) {
          // Only add to errors, don't print to console
          errors.push(`Failed to commit ${file.filePath}: ${initError.message}`);
        }
      }
    }

    // If we have errors but no commits, this might indicate a real problem
    if (errors.length > 0 && commits.length === 0) {
      // Only log the first few errors to avoid spam
      const significantErrors = errors.slice(0, 3);
      throw new Error(
        `No files could be committed. Recent errors: ${significantErrors.join('; ')}`
      );
    }

    return commits;
  }

  public async getVersions(filePath: string): Promise<VersionInfo[]> {
    return await this.versionManager.listVersions(filePath);
  }

  public async versionDiff(
    filePath: string,
    fromVersion: string,
    toVersion?: string
  ): Promise<string> {
    return await this.versionManager.diff(filePath, fromVersion, toVersion);
  }

  public async untrackWithVersioning(filePath: string): Promise<void> {
    // Remove version tracking
    await this.versionManager.removeVersioning(filePath);

    // Remove old-style tracking if it exists
    if (await this.isTracked(filePath)) {
      await this.abort(filePath);
    }
  }

  public async undoWithVersioning(filePath: string, version?: string): Promise<void> {
    const targetVersion = version || '1.0'; // Default to initial version

    // Checkout the specified version
    await this.versionManager.checkout(filePath, targetVersion);

    // Remove version tracking (stop tracking)
    await this.versionManager.removeVersioning(filePath);
  }
}
