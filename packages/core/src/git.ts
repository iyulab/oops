/**
 * Git operations wrapper for Oops
 */

import { simpleGit, SimpleGit, ResetMode } from 'simple-git';
import { GitOperationError } from './errors';
import { FileSystem } from './file-system';

export class GitWrapper {
  private git: SimpleGit | null = null;
  private isInitialized = false;

  constructor(private _workingDir: string) {
    // Lazy initialization - only create git instance when needed
  }

  public async init(): Promise<void> {
    try {
      // Ensure working directory exists
      await FileSystem.mkdir(this._workingDir);

      // Initialize git instance
      this.git = simpleGit(this._workingDir);
      await this.git.init();

      // Set up initial git configuration
      await this.git.addConfig('user.name', 'Oops');
      await this.git.addConfig('user.email', 'oops@localhost');

      this.isInitialized = true;
    } catch (error: any) {
      throw new GitOperationError('init', { error: error.message, workingDir: this._workingDir });
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.git) {
      await this.init();
    }
  }

  public async add(filePath: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.git!.add(filePath);
    } catch (error: any) {
      throw new GitOperationError('add', {
        error: error.message,
        filePath,
        workingDir: this._workingDir,
      });
    }
  }

  public async commit(message: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.git!.commit(message);
    } catch (error: any) {
      throw new GitOperationError('commit', {
        error: error.message,
        message,
        workingDir: this._workingDir,
      });
    }
  }

  public async diff(filePath?: string): Promise<string> {
    try {
      await this.ensureInitialized();

      // Check if there are any commits
      const commitCount = await this.getCommitCount();
      if (commitCount === 0) {
        // No commits yet, show staged files as diff
        if (filePath) {
          return await this.git!.diff(['--cached', filePath]);
        }
        return await this.git!.diff(['--cached']);
      }

      if (filePath) {
        return await this.git!.diff(['HEAD', filePath]);
      }
      return await this.git!.diff(['HEAD']);
    } catch (error: any) {
      // Return empty diff instead of throwing for graceful handling
      return '';
    }
  }

  public async status(): Promise<any> {
    try {
      await this.ensureInitialized();
      return await this.git!.status();
    } catch (error: any) {
      throw new GitOperationError('status', { error: error.message, workingDir: this._workingDir });
    }
  }

  public async reset(filePath?: string): Promise<void> {
    try {
      await this.ensureInitialized();
      if (filePath) {
        await this.git!.reset(['HEAD', filePath]);
      } else {
        await this.git!.reset(ResetMode.HARD);
      }
    } catch (error: any) {
      throw new GitOperationError('reset', {
        error: error.message,
        filePath,
        workingDir: this._workingDir,
      });
    }
  }

  public async checkout(filePath: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.git!.checkout(['HEAD', filePath]);
    } catch (error: any) {
      throw new GitOperationError('checkout', {
        error: error.message,
        filePath,
        workingDir: this._workingDir,
      });
    }
  }

  public async isHealthy(): Promise<boolean> {
    try {
      // Don't auto-initialize, just check if it's already initialized
      if (!this.isInitialized || !this.git) {
        return false;
      }
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  public async getCommitCount(): Promise<number> {
    try {
      await this.ensureInitialized();
      const log = await this.git!.log();
      return log.total;
    } catch {
      return 0;
    }
  }

  public async hasCommits(): Promise<boolean> {
    const count = await this.getCommitCount();
    return count > 0;
  }
}
