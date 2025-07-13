/**
 * Workspace management for Oops
 */

import * as path from 'path';
import { FileSystem } from './file-system';
import { WorkspaceInfo } from './types';
import { WorkspaceNotFoundError, WorkspaceCorruptedError } from './errors';

export class WorkspaceManager {
  private workspacePath: string;

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath || this.resolveWorkspacePath();
  }

  private resolveWorkspacePath(): string {
    // Check environment variable first (for testing and explicit overrides)
    if (process.env.OOPS_WORKSPACE) {
      return process.env.OOPS_WORKSPACE;
    }

    // Default: use .oops in current directory
    return path.join(process.cwd(), '.oops');
  }

  public getWorkspacePath(): string {
    return this.workspacePath;
  }

  public async init(): Promise<void> {
    // Create workspace directory structure
    await FileSystem.mkdir(this.workspacePath);
    await FileSystem.mkdir(path.join(this.workspacePath, 'files'));

    // Create initial config
    const configPath = path.join(this.workspacePath, 'config.json');
    const config = {
      version: '0.1.0',
      createdAt: new Date().toISOString(),
      type: 'local',
    };
    await FileSystem.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create initial state
    const statePath = path.join(this.workspacePath, 'state.json');
    const state = {
      trackedFiles: [],
      lastModified: new Date().toISOString(),
    };
    await FileSystem.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  public async exists(): Promise<boolean> {
    return await FileSystem.exists(this.workspacePath);
  }

  public async isHealthy(): Promise<boolean> {
    if (!(await this.exists())) {
      return false;
    }

    // Check for required files
    const requiredFiles = ['config.json', 'state.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(this.workspacePath, file);
      if (!(await FileSystem.exists(filePath))) {
        return false;
      }
    }

    return true;
  }

  public async getInfo(): Promise<WorkspaceInfo> {
    if (!(await this.exists())) {
      throw new WorkspaceNotFoundError(this.workspacePath);
    }

    if (!(await this.isHealthy())) {
      throw new WorkspaceCorruptedError(this.workspacePath);
    }

    // Read state to get tracked files
    const statePath = path.join(this.workspacePath, 'state.json');
    let trackedFiles: any[] = [];
    let createdAt = new Date();

    try {
      const stateContent = await FileSystem.readFile(statePath);
      const state = JSON.parse(stateContent);
      trackedFiles = state.trackedFiles || [];
    } catch {
      // If state can't be read, return empty tracked files
    }

    // Read config for creation date
    const configPath = path.join(this.workspacePath, 'config.json');
    try {
      const configContent = await FileSystem.readFile(configPath);
      const config = JSON.parse(configContent);
      if (config.createdAt) {
        createdAt = new Date(config.createdAt);
      }
    } catch {
      // If config can't be read, use current date
    }

    return {
      path: this.workspacePath,
      type: 'local',
      exists: true,
      isHealthy: true,
      trackedFiles: trackedFiles,
      createdAt: createdAt,
    };
  }

  public async clean(): Promise<void> {
    if (await this.exists()) {
      // Remove all files in the workspace
      const filesDir = path.join(this.workspacePath, 'files');
      if (await FileSystem.exists(filesDir)) {
        await FileSystem.remove(filesDir);
        await FileSystem.mkdir(filesDir);
      }

      // Reset state
      const statePath = path.join(this.workspacePath, 'state.json');
      const state = {
        trackedFiles: [],
        lastModified: new Date().toISOString(),
      };
      await FileSystem.writeFile(statePath, JSON.stringify(state, null, 2));
    }
  }

  public async repair(): Promise<void> {
    // TODO: Implement workspace repair
  }
}
