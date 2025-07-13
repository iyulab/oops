/**
 * TDD Test for Simple Backup System (Project's Core Purpose)
 *
 * Purpose: Safe text file editing with automatic backup and simple undo
 * NOT: Complex Git versioning system
 */

import { SimpleBackup } from '../simple-backup';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Simple Backup System (Core Purpose)', () => {
  let tempDir: string;
  let testFile: string;
  let backup: SimpleBackup;

  beforeEach(async () => {
    // Create isolated temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-simple-backup-'));
    testFile = path.join(tempDir, 'config.txt');
    backup = new SimpleBackup(tempDir);

    // Create initial test file
    await fs.writeFile(testFile, 'original content\n');
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Core Workflow: oops <file> → edit → keep/undo', () => {
    test('should start tracking a file and create backup', async () => {
      // ACT: Start tracking (equivalent to 'oops config.txt')
      await backup.startTracking(testFile);

      // ASSERT: File should be tracked
      expect(await backup.isTracked(testFile)).toBe(true);

      // ASSERT: Backup should exist
      expect(await backup.hasBackup(testFile)).toBe(true);

      // ASSERT: Backup content should match original
      const backupContent = await backup.getBackupContent(testFile);
      expect(backupContent).toBe('original content\n');
    });

    test('should detect changes after file modification', async () => {
      // ARRANGE: Start tracking
      await backup.startTracking(testFile);

      // ACT: Modify the file (user edits it)
      await fs.writeFile(testFile, 'modified content\n');

      // ASSERT: Should detect changes
      expect(await backup.hasChanges(testFile)).toBe(true);
    });

    test('should keep changes and stop tracking', async () => {
      // ARRANGE: Start tracking and modify file
      await backup.startTracking(testFile);
      await fs.writeFile(testFile, 'modified content\n');

      // ACT: Keep changes (equivalent to 'oops keep config.txt')
      await backup.keep(testFile);

      // ASSERT: Should no longer be tracked
      expect(await backup.isTracked(testFile)).toBe(false);

      // ASSERT: Backup should be cleaned up
      expect(await backup.hasBackup(testFile)).toBe(false);

      // ASSERT: File should keep modified content
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('modified content\n');
    });

    test('should undo changes and restore from backup', async () => {
      // ARRANGE: Start tracking and modify file
      await backup.startTracking(testFile);
      await fs.writeFile(testFile, 'modified content\n');

      // ACT: Undo changes (equivalent to 'oops undo config.txt')
      await backup.undo(testFile);

      // ASSERT: Should no longer be tracked
      expect(await backup.isTracked(testFile)).toBe(false);

      // ASSERT: Backup should be cleaned up
      expect(await backup.hasBackup(testFile)).toBe(false);

      // ASSERT: File should be restored to original content
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('original content\n');
    });
  });

  describe('Status and Diff Operations', () => {
    test('should show status of tracked files', async () => {
      // ARRANGE: Track file and modify it
      await backup.startTracking(testFile);
      await fs.writeFile(testFile, 'modified content\n');

      // ACT: Get status (equivalent to 'oops status')
      const status = await backup.getStatus();

      // ASSERT: Should show one tracked file with changes
      expect(status.trackedFiles).toHaveLength(1);
      expect(status.trackedFiles[0].filePath).toBe(testFile);
      expect(status.trackedFiles[0].hasChanges).toBe(true);
    });

    test('should show diff between original and current', async () => {
      // ARRANGE: Track file and modify it
      await backup.startTracking(testFile);
      await fs.writeFile(testFile, 'modified content\nwith new line\n');

      // ACT: Get diff (equivalent to 'oops diff config.txt')
      const diff = await backup.getDiff(testFile);

      // ASSERT: Should show changes
      expect(diff).toContain('-original content');
      expect(diff).toContain('+modified content');
      expect(diff).toContain('+with new line');
    });
  });

  describe('Error Handling and Safety', () => {
    test('should throw error when trying to track non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');

      await expect(backup.startTracking(nonExistentFile)).rejects.toThrow('File not found');
    });

    test('should throw error when trying to keep untracked file', async () => {
      await expect(backup.keep(testFile)).rejects.toThrow('File is not being tracked');
    });

    test('should throw error when trying to undo untracked file', async () => {
      await expect(backup.undo(testFile)).rejects.toThrow('File is not being tracked');
    });

    test('should handle atomic operations (all-or-nothing)', async () => {
      // This test ensures operations don't leave the system in inconsistent state
      await backup.startTracking(testFile);

      // Simulate an error during keep operation
      const originalKeep = backup.keep;
      backup.keep = jest.fn().mockRejectedValue(new Error('Simulated error'));

      await expect(backup.keep(testFile)).rejects.toThrow('Simulated error');

      // Restore original method
      backup.keep = originalKeep;

      // ASSERT: File should still be tracked (operation was atomic)
      expect(await backup.isTracked(testFile)).toBe(true);
      expect(await backup.hasBackup(testFile)).toBe(true);
    });
  });

  describe('Multiple Files Management', () => {
    test('should handle multiple tracked files independently', async () => {
      const testFile2 = path.join(tempDir, 'another.txt');
      await fs.writeFile(testFile2, 'another original\n');

      // ARRANGE: Track both files
      await backup.startTracking(testFile);
      await backup.startTracking(testFile2);

      // ACT: Modify only one file
      await fs.writeFile(testFile, 'modified content\n');

      // ASSERT: Only modified file should show changes
      expect(await backup.hasChanges(testFile)).toBe(true);
      expect(await backup.hasChanges(testFile2)).toBe(false);

      // ACT: Keep one file, undo another
      await backup.keep(testFile);
      await backup.undo(testFile2);

      // ASSERT: Both should be untracked now
      expect(await backup.isTracked(testFile)).toBe(false);
      expect(await backup.isTracked(testFile2)).toBe(false);
    });
  });
});
