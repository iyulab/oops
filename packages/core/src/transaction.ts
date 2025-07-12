/**
 * Atomic transaction system for file operations
 */

import * as fs from 'fs/promises';
import { FileSystem } from './file-system';
import { OopsError } from './errors';

export interface TransactionOperation {
  type: 'create' | 'copy' | 'move' | 'delete' | 'write';
  source?: string;
  target: string;
  content?: string;
  execute(): Promise<string>; // Returns rollback action
}

export class Transaction {
  private operations: TransactionOperation[] = [];
  private rollbackActions: (() => Promise<void>)[] = [];
  private isCommitted = false;
  private isRolledBack = false;

  public addOperation(operation: TransactionOperation): void {
    if (this.isCommitted || this.isRolledBack) {
      throw new OopsError('Cannot add operation to completed transaction', 'TRANSACTION_COMPLETED');
    }
    this.operations.push(operation);
  }

  public async execute(): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new OopsError('Transaction already completed', 'TRANSACTION_COMPLETED');
    }

    try {
      // Execute all operations and collect rollback actions
      for (const operation of this.operations) {
        const rollbackAction = await operation.execute();

        // Create rollback function
        const rollback = this.createRollbackFunction(operation, rollbackAction);
        this.rollbackActions.unshift(rollback); // Add to beginning for reverse order
      }

      this.isCommitted = true;
    } catch (error) {
      // Rollback on any failure
      await this.rollback();
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    if (this.isRolledBack) {
      return; // Already rolled back
    }

    try {
      // Execute rollback actions in reverse order
      for (const rollbackAction of this.rollbackActions) {
        await rollbackAction();
      }
    } catch (error) {
      // Log rollback errors but don't throw
      console.error('Error during transaction rollback:', error);
    } finally {
      this.isRolledBack = true;
    }
  }

  private createRollbackFunction(
    operation: TransactionOperation,
    rollbackAction: string
  ): () => Promise<void> {
    return async () => {
      switch (operation.type) {
        case 'create':
          // Delete created file
          if (await FileSystem.exists(operation.target)) {
            await fs.unlink(operation.target);
          }
          break;
        case 'copy':
          // Delete copied file
          if (await FileSystem.exists(operation.target)) {
            await fs.unlink(operation.target);
          }
          break;
        case 'move':
          // Move back to original location
          if (rollbackAction && (await FileSystem.exists(operation.target))) {
            await fs.rename(operation.target, rollbackAction);
          }
          break;
        case 'delete':
          // Restore from backup if available
          if (rollbackAction && (await FileSystem.exists(rollbackAction))) {
            await fs.rename(rollbackAction, operation.target);
          }
          break;
        case 'write':
          // Restore original content
          if (rollbackAction) {
            await fs.writeFile(operation.target, rollbackAction, 'utf8');
          }
          break;
      }
    };
  }
}

export class FileOperations {
  public static createFile(filePath: string, content: string): TransactionOperation {
    return {
      type: 'create',
      target: filePath,
      content,
      async execute(): Promise<string> {
        await FileSystem.writeFile(filePath, content);
        return ''; // No rollback data needed
      },
    };
  }

  public static copyFile(source: string, target: string): TransactionOperation {
    return {
      type: 'copy',
      source,
      target,
      async execute(): Promise<string> {
        await FileSystem.copyFile(source, target);
        return ''; // No rollback data needed
      },
    };
  }

  public static moveFile(source: string, target: string): TransactionOperation {
    return {
      type: 'move',
      source,
      target,
      async execute(): Promise<string> {
        await fs.rename(source, target);
        return source; // Return original path for rollback
      },
    };
  }

  public static deleteFile(filePath: string): TransactionOperation {
    return {
      type: 'delete',
      target: filePath,
      async execute(): Promise<string> {
        // Create backup before deletion
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.rename(filePath, backupPath);
        return backupPath; // Return backup path for rollback
      },
    };
  }

  public static writeFile(filePath: string, content: string): TransactionOperation {
    return {
      type: 'write',
      target: filePath,
      content,
      async execute(): Promise<string> {
        let originalContent = '';

        // Read original content if file exists
        if (await FileSystem.exists(filePath)) {
          originalContent = await FileSystem.readFile(filePath);
        }

        // Write new content
        await FileSystem.writeFile(filePath, content);

        return originalContent; // Return original content for rollback
      },
    };
  }

  public static createDirectory(dirPath: string): TransactionOperation {
    return {
      type: 'create',
      target: dirPath,
      async execute(): Promise<string> {
        await FileSystem.mkdir(dirPath);
        return ''; // No rollback data needed
      },
    };
  }
}
