/**
 * Tests for transaction system
 */

import { Transaction, FileOperations } from '../transaction';
import { FileSystem } from '../file-system';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Transaction System', () => {
  let tempDir: string;
  let testFile: string;
  let testFile2: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'oops-transaction-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    testFile = path.join(tempDir, 'test.txt');
    testFile2 = path.join(tempDir, 'test2.txt');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Transaction', () => {
    it('should execute operations successfully', async () => {
      const transaction = new Transaction();
      const content = 'Hello, World!';

      transaction.addOperation(FileOperations.createFile(testFile, content));

      await transaction.execute();

      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(content);
    });

    it('should rollback on failure', async () => {
      const transaction = new Transaction();

      // Add successful operation
      transaction.addOperation(FileOperations.createFile(testFile, 'test'));

      // Add failing operation
      transaction.addOperation({
        type: 'create',
        target: '/invalid/path/file.txt',
        async execute() {
          throw new Error('Simulated failure');
        }
      });

      await expect(transaction.execute()).rejects.toThrow('Simulated failure');

      // Check that successful operation was rolled back
      const exists = await FileSystem.exists(testFile);
      expect(exists).toBe(false);
    });

    it('should handle multiple operations', async () => {
      const transaction = new Transaction();
      const content1 = 'File 1';
      const content2 = 'File 2';

      transaction.addOperation(FileOperations.createFile(testFile, content1));
      transaction.addOperation(FileOperations.createFile(testFile2, content2));

      await transaction.execute();

      const result1 = await fs.readFile(testFile, 'utf8');
      const result2 = await fs.readFile(testFile2, 'utf8');

      expect(result1).toBe(content1);
      expect(result2).toBe(content2);
    });
  });

  describe('FileOperations', () => {
    it('should create file operation', async () => {
      const content = 'Test content';
      const operation = FileOperations.createFile(testFile, content);

      await operation.execute();

      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(content);
    });

    it('should copy file operation', async () => {
      const content = 'Copy test';
      await fs.writeFile(testFile, content);

      const operation = FileOperations.copyFile(testFile, testFile2);
      await operation.execute();

      const result = await fs.readFile(testFile2, 'utf8');
      expect(result).toBe(content);
    });

    it('should write file operation with rollback', async () => {
      const originalContent = 'Original';
      const newContent = 'New content';

      await fs.writeFile(testFile, originalContent);

      const operation = FileOperations.writeFile(testFile, newContent);
      const rollbackData = await operation.execute();

      // Check new content is written
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(newContent);

      // Check rollback data contains original content
      expect(rollbackData).toBe(originalContent);
    });
  });

  describe('FileSystem Safe Operations', () => {
    it('should safely write file', async () => {
      const content = 'Safe write test';

      await FileSystem.safeWriteFile(testFile, content);

      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(content);
    });

    it('should safely copy file', async () => {
      const content = 'Safe copy test';
      await fs.writeFile(testFile, content);

      await FileSystem.safeCopyFile(testFile, testFile2);

      const result = await fs.readFile(testFile2, 'utf8');
      expect(result).toBe(content);
    });

    it('should get file info', async () => {
      const content = 'File info test';
      await fs.writeFile(testFile, content);

      const info = await FileSystem.getFileInfo(testFile);

      expect(info.exists).toBe(true);
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBe(content.length);
      expect(info.permissions.readable).toBe(true);
    });

    it('should handle non-existent file info', async () => {
      const info = await FileSystem.getFileInfo('/non/existent/file.txt');

      expect(info.exists).toBe(false);
      expect(info.isFile).toBe(false);
      expect(info.size).toBe(0);
      expect(info.permissions.readable).toBe(false);
    });
  });
});