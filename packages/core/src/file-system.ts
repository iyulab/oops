/**
 * File system operations for Oops
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileNotFoundError, PermissionError, OopsError, FileOperationError } from './errors';
import { Transaction, FileOperations } from './transaction';

export class FileSystem {
  public static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public static async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(filePath);
      }
      if (error.code === 'EACCES') {
        throw new PermissionError(filePath, 'read');
      }
      throw error;
    }
  }

  public static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new PermissionError(filePath, 'write');
      }
      throw error;
    }
  }

  public static async copyFile(source: string, destination: string): Promise<void> {
    try {
      await fs.copyFile(source, destination);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(source);
      }
      if (error.code === 'EACCES') {
        throw new PermissionError(destination, 'write');
      }
      throw error;
    }
  }

  public static async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new PermissionError(dirPath, 'create');
      }
      throw error;
    }
  }

  public static async stat(filePath: string): Promise<any> {
    try {
      return await fs.stat(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(filePath);
      }
      throw error;
    }
  }

  /**
   * Atomic file operations using transactions
   */
  public static async safeWriteFile(filePath: string, content: string): Promise<void> {
    const transaction = new Transaction();

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!(await this.exists(dir))) {
        transaction.addOperation(FileOperations.createDirectory(dir));
      }

      // Write file
      transaction.addOperation(FileOperations.writeFile(filePath, content));

      await transaction.execute();
    } catch (error) {
      throw new OopsError(`Failed to safely write file: ${filePath}`, 'SAFE_WRITE_ERROR', {
        error,
      });
    }
  }

  public static async safeCopyFile(source: string, destination: string): Promise<void> {
    const transaction = new Transaction();

    try {
      // Ensure destination directory exists
      const dir = path.dirname(destination);
      if (!(await this.exists(dir))) {
        transaction.addOperation(FileOperations.createDirectory(dir));
      }

      // Copy file
      transaction.addOperation(FileOperations.copyFile(source, destination));

      await transaction.execute();
    } catch (error) {
      throw new OopsError(
        `Failed to safely copy file: ${source} -> ${destination}`,
        'SAFE_COPY_ERROR',
        { error }
      );
    }
  }

  public static async safeMoveFile(source: string, destination: string): Promise<void> {
    const transaction = new Transaction();

    try {
      // Ensure destination directory exists
      const dir = path.dirname(destination);
      if (!(await this.exists(dir))) {
        transaction.addOperation(FileOperations.createDirectory(dir));
      }

      // Move file
      transaction.addOperation(FileOperations.moveFile(source, destination));

      await transaction.execute();
    } catch (error) {
      throw new OopsError(
        `Failed to safely move file: ${source} -> ${destination}`,
        'SAFE_MOVE_ERROR',
        { error }
      );
    }
  }

  public static async safeDeleteFile(filePath: string): Promise<void> {
    const transaction = new Transaction();

    try {
      transaction.addOperation(FileOperations.deleteFile(filePath));
      await transaction.execute();
    } catch (error) {
      throw new OopsError(`Failed to safely delete file: ${filePath}`, 'SAFE_DELETE_ERROR', {
        error,
      });
    }
  }

  /**
   * Validate file permissions before operations
   */
  public static async validatePermissions(
    filePath: string,
    operation: 'read' | 'write' | 'execute'
  ): Promise<void> {
    try {
      await fs.stat(filePath);

      // Check if file exists and has required permissions
      switch (operation) {
        case 'read':
          await fs.access(filePath, fs.constants.R_OK);
          break;
        case 'write':
          await fs.access(filePath, fs.constants.W_OK);
          break;
        case 'execute':
          await fs.access(filePath, fs.constants.X_OK);
          break;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(filePath);
      }
      if (error.code === 'EACCES') {
        throw new PermissionError(filePath, operation);
      }
      throw error;
    }
  }

  /**
   * Get file metadata with validation
   */
  public static async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size: number;
    modified: Date;
    isDirectory: boolean;
    isFile: boolean;
    permissions: {
      readable: boolean;
      writable: boolean;
      executable: boolean;
    };
  }> {
    try {
      const stats = await fs.stat(filePath);

      // Check permissions
      const permissions = {
        readable: await this.checkPermission(filePath, fs.constants.R_OK),
        writable: await this.checkPermission(filePath, fs.constants.W_OK),
        executable: await this.checkPermission(filePath, fs.constants.X_OK),
      };

      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          exists: false,
          size: 0,
          modified: new Date(0),
          isDirectory: false,
          isFile: false,
          permissions: {
            readable: false,
            writable: false,
            executable: false,
          },
        };
      }
      throw error;
    }
  }

  /**
   * Remove file or directory recursively
   */
  public static async remove(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new FileOperationError('remove', filePath, error.message);
      }
    }
  }

  /**
   * Create temporary directory
   */
  public static async createTempDirectory(prefix: string = 'tmp-'): Promise<string> {
    try {
      const tmpdir = require('os').tmpdir();
      return await fs.mkdtemp(path.join(tmpdir, prefix));
    } catch (error: any) {
      throw new FileOperationError('create_temp_dir', prefix, error.message);
    }
  }

  private static async checkPermission(filePath: string, permission: number): Promise<boolean> {
    try {
      await fs.access(filePath, permission);
      return true;
    } catch {
      return false;
    }
  }
}
