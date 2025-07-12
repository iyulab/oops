/**
 * List command implementation (default when no command specified)
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ListCommand extends BaseCommand {
  public async validate(_args: any[]): Promise<void> {
    // List command accepts no arguments
  }

  public async execute(_args: any[]): Promise<void> {
    try {
      const oops = new Oops();

      // Check if workspace exists
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (!workspaceInfo.exists) {
        this.log('No workspace found. Run "oops init" to initialize a workspace.');
        this.log('');
        await this.showDirectoryFiles();
        return;
      }

      this.log('Files in current directory:');

      // Get current directory files
      const currentDir = process.cwd();
      const files = await fs.readdir(currentDir);

      // Get tracked files for status
      const trackedFilesMap = new Map();
      for (const trackedFile of workspaceInfo.trackedFiles) {
        const relativePath = path.relative(currentDir, trackedFile.filePath);
        const isTracked = await oops.isTracked(trackedFile.filePath);
        if (isTracked) {
          const hasChanges = await oops.hasChanges(trackedFile.filePath);
          trackedFilesMap.set(relativePath, hasChanges ? 'modified' : 'clean');
        }
      }

      // Show files with status
      for (const file of files.sort()) {
        const filePath = path.join(currentDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          if (file === '.oops' || file === '.oops') {
            this.log(`* ${file}/          [workspace]`);
          } else {
            this.log(`  ${file}/`);
          }
        } else {
          const status = trackedFilesMap.get(file);
          if (status) {
            this.log(`  ${file}        [tracked - ${status}]`);
          } else {
            this.log(`  ${file}`);
          }
        }
      }
    } catch (error: any) {
      this.error('Failed to list files: ' + error.message);
      throw error;
    }
  }

  private async showDirectoryFiles(): Promise<void> {
    try {
      this.log('Files in current directory:');
      const files = await fs.readdir(process.cwd());

      for (const file of files.sort()) {
        const stats = await fs.stat(file);
        if (stats.isDirectory()) {
          this.log(`  ${file}/`);
        } else {
          this.log(`  ${file}`);
        }
      }
    } catch (error) {
      this.log('Unable to read current directory');
    }
  }
}
