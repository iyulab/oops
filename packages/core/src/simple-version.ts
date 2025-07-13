/**
 * Simple Version Management System
 * Implements Git-style version numbering without Git dependency
 */

import { FileSystem } from './file-system';
import { OopsError } from './errors';
import * as path from 'path';
import * as crypto from 'crypto';

export interface VersionInfo {
  version: number;
  message: string;
  timestamp: Date;
  checksum: string;
  content: string;
}

export interface CommitResult {
  version: number;
  message: string;
  previousVersion?: number;
}

export class SimpleVersionManager {
  private versionsPath: string;
  private filePath: string;

  constructor(workspacePath: string, filePath: string) {
    const fileHash = this.generateFileHash(filePath);
    this.versionsPath = path.join(workspacePath, 'versions', fileHash);
    this.filePath = filePath;
  }

  /**
   * Initialize version system for a file
   */
  async initialize(): Promise<void> {
    await FileSystem.mkdir(this.versionsPath);
  }

  /**
   * Create initial version (1)
   */
  async createInitialVersion(message = 'Initial version'): Promise<VersionInfo> {
    const content = await FileSystem.readFile(this.filePath);
    const version = 1;

    const versionInfo: VersionInfo = {
      version,
      message,
      timestamp: new Date(),
      checksum: this.generateChecksum(content),
      content,
    };

    await this.saveVersion(versionInfo);
    await this.setCurrentVersion(version);

    return versionInfo;
  }

  /**
   * Commit changes as new version
   */
  async commitVersion(message: string): Promise<CommitResult> {
    const currentContent = await FileSystem.readFile(this.filePath);
    const currentVersion = await this.getCurrentVersion();

    // Check if there are changes
    if (currentVersion) {
      const lastVersion = await this.getVersion(currentVersion);
      if (lastVersion && lastVersion.content === currentContent) {
        throw new OopsError('No changes detected since last version', 'VERSION_NO_CHANGES');
      }
    }

    // Determine next version
    const nextVersion = await this.getNextVersion();

    const versionInfo: VersionInfo = {
      version: nextVersion,
      message,
      timestamp: new Date(),
      checksum: this.generateChecksum(currentContent),
      content: currentContent,
    };

    await this.saveVersion(versionInfo);
    await this.setCurrentVersion(nextVersion);

    return {
      version: nextVersion,
      message,
      previousVersion: currentVersion || undefined,
    };
  }

  /**
   * Get all versions in chronological order
   */
  async getAllVersions(): Promise<VersionInfo[]> {
    const versionsFile = path.join(this.versionsPath, 'versions.json');

    if (!(await FileSystem.exists(versionsFile))) {
      return [];
    }

    const data = await FileSystem.readFile(versionsFile);
    const versions = JSON.parse(data);

    // Convert timestamp strings back to Date objects
    return versions.map((v: any) => ({
      ...v,
      timestamp: new Date(v.timestamp),
    }));
  }

  /**
   * Get specific version
   */
  async getVersion(version: number): Promise<VersionInfo | null> {
    const versions = await this.getAllVersions();
    return versions.find(v => v.version === version) || null;
  }

  /**
   * Checkout specific version
   */
  async checkoutVersion(version: number): Promise<void> {
    const versionInfo = await this.getVersion(version);

    if (!versionInfo) {
      throw new OopsError(`Version ${version} not found`, 'VERSION_NOT_FOUND');
    }

    // Write version content to file
    await FileSystem.writeFile(this.filePath, versionInfo.content);
    await this.setCurrentVersion(version);
  }

  /**
   * Get current version
   */
  async getCurrentVersion(): Promise<number | null> {
    const currentFile = path.join(this.versionsPath, 'current.txt');

    if (!(await FileSystem.exists(currentFile))) {
      return null;
    }

    const versionStr = await FileSystem.readFile(currentFile);
    return parseInt(versionStr, 10);
  }

  /**
   * Get diff between versions
   */
  async getDiff(fromVersion?: number, toVersion?: number): Promise<string> {
    let fromContent: string;
    let toContent: string;

    if (!fromVersion && !toVersion) {
      // Diff working directory against last version
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion) {
        return 'No versions to compare with';
      }

      const lastVersionInfo = await this.getVersion(currentVersion);
      fromContent = lastVersionInfo ? lastVersionInfo.content : '';
      toContent = await FileSystem.readFile(this.filePath);
    } else if (fromVersion && !toVersion) {
      // Diff specific version against working directory
      const fromVersionInfo = await this.getVersion(fromVersion);
      if (!fromVersionInfo) {
        throw new OopsError(`Version ${fromVersion} not found`, 'VERSION_NOT_FOUND');
      }
      fromContent = fromVersionInfo.content;
      toContent = await FileSystem.readFile(this.filePath);
    } else if (fromVersion && toVersion) {
      // Diff between two versions
      const fromVersionInfo = await this.getVersion(fromVersion);
      const toVersionInfo = await this.getVersion(toVersion);

      if (!fromVersionInfo) {
        throw new OopsError(`Version ${fromVersion} not found`, 'VERSION_NOT_FOUND');
      }
      if (!toVersionInfo) {
        throw new OopsError(`Version ${toVersion} not found`, 'VERSION_NOT_FOUND');
      }

      fromContent = fromVersionInfo.content;
      toContent = toVersionInfo.content;
    } else {
      return 'Invalid diff parameters';
    }

    return this.generateSimpleDiff(fromContent, toContent);
  }

  /**
   * Check if file has changes since last version
   */
  async hasChanges(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    if (!currentVersion) {
      return true; // No versions means there are changes to track
    }

    const lastVersion = await this.getVersion(currentVersion);
    if (!lastVersion) {
      return true;
    }

    const currentContent = await FileSystem.readFile(this.filePath);
    return lastVersion.content !== currentContent;
  }

  // Private helper methods

  private async saveVersion(versionInfo: VersionInfo): Promise<void> {
    const versionsFile = path.join(this.versionsPath, 'versions.json');

    let versions: VersionInfo[] = [];
    if (await FileSystem.exists(versionsFile)) {
      const data = await FileSystem.readFile(versionsFile);
      versions = JSON.parse(data);
    }

    versions.push(versionInfo);
    await FileSystem.writeFile(versionsFile, JSON.stringify(versions, null, 2));
  }

  private async setCurrentVersion(version: number): Promise<void> {
    const currentFile = path.join(this.versionsPath, 'current.txt');
    await FileSystem.writeFile(currentFile, version.toString());
  }

  private async getNextVersion(): Promise<number> {
    const versions = await this.getAllVersions();

    if (versions.length === 0) {
      return 1;
    }

    // Find the highest version number and increment by 1
    const maxVersion = Math.max(...versions.map(v => v.version));
    return maxVersion + 1;
  }

  private generateFileHash(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 8);
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  }

  private generateSimpleDiff(fromContent: string, toContent: string): string {
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    const fileName = path.basename(this.filePath);
    let diff = `diff --git a/${fileName} b/${fileName}\n`;
    diff += `--- a/${fileName}\n`;
    diff += `+++ b/${fileName}\n`;

    // Simple line-by-line diff
    const maxLines = Math.max(fromLines.length, toLines.length);
    let hasChanges = false;

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i] || '';
      const toLine = toLines[i] || '';

      if (fromLine !== toLine) {
        if (!hasChanges) {
          diff += `@@ -${i + 1},${fromLines.length - i} +${i + 1},${toLines.length - i} @@\n`;
          hasChanges = true;
        }

        if (fromLine) {
          diff += `-${fromLine}\n`;
        }
        if (toLine) {
          diff += `+${toLine}\n`;
        }
      }
    }

    return hasChanges ? diff : 'No differences found';
  }
}
