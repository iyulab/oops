/**
 * Test suite for FileSystem utilities
 */

import { FileSystem } from '../file-system';
import * as path from 'path';
import * as os from 'os';

describe('FileSystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `fs-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await FileSystem.mkdir(tempDir);
  });

  afterEach(async () => {
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Directory Operations', () => {
    test('should create directory', async () => {
      const newDir = path.join(tempDir, 'newdir');
      await FileSystem.mkdir(newDir);
      
      expect(await FileSystem.exists(newDir)).toBe(true);
    });

    test('should create nested directories', async () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c');
      await FileSystem.mkdir(nestedDir);
      
      expect(await FileSystem.exists(nestedDir)).toBe(true);
    });

    test('should not throw when creating existing directory', async () => {
      await expect(FileSystem.mkdir(tempDir)).resolves.not.toThrow();
    });
  });

  describe('File Operations', () => {
    test('should write and read file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello World';
      
      await FileSystem.writeFile(filePath, content);
      const readContent = await FileSystem.readFile(filePath);
      
      expect(readContent).toBe(content);
    });

    test('should copy file', async () => {
      const sourceFile = path.join(tempDir, 'source.txt');
      const destFile = path.join(tempDir, 'dest.txt');
      const content = 'Test content';
      
      await FileSystem.writeFile(sourceFile, content);
      await FileSystem.copyFile(sourceFile, destFile);
      
      const copiedContent = await FileSystem.readFile(destFile);
      expect(copiedContent).toBe(content);
    });

    test('should check file existence', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      
      expect(await FileSystem.exists(filePath)).toBe(false);
      
      await FileSystem.writeFile(filePath, 'content');
      expect(await FileSystem.exists(filePath)).toBe(true);
    });

    test('should get file stats', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello World';
      
      await FileSystem.writeFile(filePath, content);
      const stats = await FileSystem.stat(filePath);
      
      expect(stats.size).toBe(content.length);
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
    });

    test('should get directory stats', async () => {
      const stats = await FileSystem.stat(tempDir);
      
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when reading non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      
      await expect(FileSystem.readFile(nonExistentFile)).rejects.toThrow();
    });

    test('should throw error when copying non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      const destFile = path.join(tempDir, 'dest.txt');
      
      await expect(FileSystem.copyFile(nonExistentFile, destFile)).rejects.toThrow();
    });

    test('should throw error when getting stats of non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      
      await expect(FileSystem.stat(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('Path Handling', () => {
    test('should handle absolute paths', async () => {
      const absolutePath = path.resolve(tempDir, 'absolute.txt');
      await FileSystem.writeFile(absolutePath, 'content');
      
      expect(await FileSystem.exists(absolutePath)).toBe(true);
    });

    test('should handle special characters in filenames', async () => {
      const specialFile = path.join(tempDir, 'file with spaces & symbols!.txt');
      await FileSystem.writeFile(specialFile, 'content');
      
      expect(await FileSystem.exists(specialFile)).toBe(true);
      
      const content = await FileSystem.readFile(specialFile);
      expect(content).toBe('content');
    });
  });

  describe('File System Edge Cases', () => {
    test('should handle empty file', async () => {
      const emptyFile = path.join(tempDir, 'empty.txt');
      await FileSystem.writeFile(emptyFile, '');
      
      const content = await FileSystem.readFile(emptyFile);
      expect(content).toBe('');
      
      const stats = await FileSystem.stat(emptyFile);
      expect(stats.size).toBe(0);
    });

    test('should handle large content', async () => {
      const largeContent = 'A'.repeat(1000000); // 1MB of 'A's
      const largeFile = path.join(tempDir, 'large.txt');
      
      await FileSystem.writeFile(largeFile, largeContent);
      const readContent = await FileSystem.readFile(largeFile);
      
      expect(readContent).toBe(largeContent);
      expect(readContent.length).toBe(1000000);
    });

    test('should handle binary data', async () => {
      const binaryData = Buffer.from([0, 1, 2, 3, 255, 254, 253]);
      const binaryFile = path.join(tempDir, 'binary.dat');
      
      // Write binary data as string for text file handling
      const binaryString = binaryData.toString('utf8');
      await FileSystem.writeFile(binaryFile, binaryString);
      const readData = await FileSystem.readFile(binaryFile);
      
      expect(readData).toBe(binaryString);
    });
  });
});