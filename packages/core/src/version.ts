/**
 * Version management for Oops file tracking
 * Implements semantic versioning (1.0 → 1.1 → 1.2) with branching support
 */

import * as path from 'path';
import { FileSystem } from './file-system';
import { FileNotFoundError, FileNotTrackedError } from './errors';
import { VersionInfo, VersionHistory } from './types';

export class VersionManager {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Initialize version tracking for a file (creates version 1.0)
   */
  public async initializeVersioning(filePath: string, message?: string): Promise<VersionInfo> {
    if (!(await FileSystem.exists(filePath))) {
      throw new FileNotFoundError(filePath);
    }

    const versionPath = this.getVersionPath(filePath);
    await FileSystem.mkdir(versionPath);

    // Create version 1.0
    const version = '1.0';
    const versionInfo = await this.createVersion(filePath, version, message || 'Initial version');

    // Initialize version history
    const history: VersionHistory = {
      filePath,
      versions: [versionInfo],
      currentVersion: version,
      branches: {},
    };

    await this.saveVersionHistory(filePath, history);
    return versionInfo;
  }

  /**
   * Create a new version (commit) of the file
   */
  public async createCommit(filePath: string, message?: string): Promise<VersionInfo> {
    const history = await this.getVersionHistory(filePath);

    // Calculate next version number
    const nextVersion = this.calculateNextVersion(history.currentVersion);

    // Create the new version
    const versionInfo = await this.createVersion(filePath, nextVersion, message);

    // Update history
    history.versions.push(versionInfo);
    history.currentVersion = nextVersion;

    // Add to branches if needed
    const parentVersion = history.currentVersion;
    if (!history.branches[parentVersion]) {
      history.branches[parentVersion] = [];
    }

    await this.saveVersionHistory(filePath, history);
    return versionInfo;
  }

  /**
   * Checkout a specific version
   */
  public async checkout(filePath: string, version: string): Promise<void> {
    const history = await this.getVersionHistory(filePath);
    const versionInfo = history.versions.find(v => v.version === version);

    if (!versionInfo) {
      throw new Error(`Version ${version} not found for file ${filePath}`);
    }

    // Restore file content from version
    const versionFilePath = this.getVersionFilePath(filePath, version);
    await FileSystem.copyFile(versionFilePath, filePath);

    // Update current version in history
    history.currentVersion = version;
    await this.saveVersionHistory(filePath, history);
  }

  /**
   * Get version history for a file
   */
  public async getVersionHistory(filePath: string): Promise<VersionHistory> {
    const historyPath = this.getHistoryPath(filePath);

    if (!(await FileSystem.exists(historyPath))) {
      throw new FileNotTrackedError(filePath);
    }

    try {
      const historyContent = await FileSystem.readFile(historyPath);
      const history = JSON.parse(historyContent);

      // Parse dates
      history.versions = history.versions.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp),
      }));

      return history;
    } catch (error) {
      throw new Error(`Failed to read version history for ${filePath}: ${error}`);
    }
  }

  /**
   * Get diff between two versions
   */
  public async diff(filePath: string, fromVersion: string, toVersion?: string): Promise<string> {
    const history = await this.getVersionHistory(filePath);

    // Default to current version if toVersion not specified
    const targetVersion = toVersion || history.currentVersion;

    const fromFile = this.getVersionFilePath(filePath, fromVersion);
    const toFile = this.getVersionFilePath(filePath, targetVersion);

    if (!(await FileSystem.exists(fromFile))) {
      throw new Error(`Version ${fromVersion} not found`);
    }

    if (!(await FileSystem.exists(toFile))) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Simple diff implementation (could be enhanced with proper diff algorithm)
    const fromContent = await FileSystem.readFile(fromFile);
    const toContent = await FileSystem.readFile(toFile);

    if (fromContent === toContent) {
      return 'No differences found';
    }

    return this.generateSimpleDiff(fromContent, toContent, fromVersion, targetVersion);
  }

  /**
   * List all versions for a file
   */
  public async listVersions(filePath: string): Promise<VersionInfo[]> {
    const history = await this.getVersionHistory(filePath);
    return history.versions.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  /**
   * Check if file has changes compared to current version
   */
  public async hasChanges(filePath: string): Promise<boolean> {
    try {
      const history = await this.getVersionHistory(filePath);
      const currentVersionFile = this.getVersionFilePath(filePath, history.currentVersion);

      if (!(await FileSystem.exists(currentVersionFile))) {
        return true; // No version file means changes
      }

      const currentContent = await FileSystem.readFile(filePath);
      const versionContent = await FileSystem.readFile(currentVersionFile);

      return currentContent !== versionContent;
    } catch {
      return true; // Error means we assume changes
    }
  }

  /**
   * Remove version tracking for a file
   */
  public async removeVersioning(filePath: string): Promise<void> {
    const versionPath = this.getVersionPath(filePath);

    if (await FileSystem.exists(versionPath)) {
      const fs = await import('fs/promises');
      await fs.rm(versionPath, { recursive: true, force: true });
    }
  }

  private async createVersion(
    filePath: string,
    version: string,
    message?: string
  ): Promise<VersionInfo> {
    const versionFilePath = this.getVersionFilePath(filePath, version);

    // Copy current file content to version file
    await FileSystem.copyFile(filePath, versionFilePath);

    // Calculate checksum (simple implementation)
    const content = await FileSystem.readFile(filePath);
    const checksum = Buffer.from(content).toString('base64').substring(0, 8);

    return {
      version,
      message,
      timestamp: new Date(),
      checksum,
      filePath,
    };
  }

  private calculateNextVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]) + 1;

    return `${major}.${minor}`;
  }

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

  private generateSimpleDiff(
    fromContent: string,
    toContent: string,
    fromVersion: string,
    toVersion: string
  ): string {
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    let diff = `diff --git a/${fromVersion} b/${toVersion}\n`;
    diff += `index ${fromVersion}..${toVersion}\n`;
    diff += `--- a/${fromVersion}\n`;
    diff += `+++ b/${toVersion}\n`;

    // Simple line-by-line comparison
    const maxLines = Math.max(fromLines.length, toLines.length);
    let lineNumber = 1;

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i] || '';
      const toLine = toLines[i] || '';

      if (fromLine !== toLine) {
        diff += `@@ -${lineNumber},1 +${lineNumber},1 @@\n`;
        if (fromLines[i] !== undefined) {
          diff += `-${fromLine}\n`;
        }
        if (toLines[i] !== undefined) {
          diff += `+${toLine}\n`;
        }
      }
      lineNumber++;
    }

    return diff;
  }

  private getVersionPath(filePath: string): string {
    const hash = this.hashPath(filePath);
    return path.join(this.workspacePath, 'versions', hash);
  }

  private getVersionFilePath(filePath: string, version: string): string {
    const versionPath = this.getVersionPath(filePath);
    return path.join(versionPath, `${version}.txt`);
  }

  private getHistoryPath(filePath: string): string {
    const versionPath = this.getVersionPath(filePath);
    return path.join(versionPath, 'history.json');
  }

  private async saveVersionHistory(filePath: string, history: VersionHistory): Promise<void> {
    const historyPath = this.getHistoryPath(filePath);
    await FileSystem.writeFile(historyPath, JSON.stringify(history, null, 2));
  }

  private hashPath(filePath: string): string {
    return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '_');
  }
}
