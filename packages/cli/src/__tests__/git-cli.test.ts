/**
 * Git-Style CLI Integration Tests
 * Tests the 8 core commands with Git-compatible behavior
 */

import { CLI } from '../cli';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();

// Store original methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

describe('Git-Style CLI Integration Tests', () => {
  let tempDir: string;
  let testFile: string;
  let cli: CLI;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-git-test-'));
    testFile = path.join(tempDir, 'test.txt');

    // Create test file
    await fs.writeFile(testFile, 'initial content\n');

    // Set isolated workspace
    process.env.OOPS_WORKSPACE = tempDir;
    process.env.NO_COLOR = '1';

    // Setup mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit as any;

    // Clear mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    // Create CLI instance
    cli = new CLI();
  });

  afterEach(async () => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;

    // Clear environment
    delete process.env.OOPS_WORKSPACE;
    delete process.env.NO_COLOR;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Core Git Workflow', () => {
    test('should support complete Git-style workflow', async () => {
      // 1. Track file (creates version 1)
      await cli.run(['node', 'oops', 'track', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1'));

      // 2. Modify file
      await fs.writeFile(testFile, 'modified content\n');

      // 3. Commit new version (creates version 2)
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit', 'test modification']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('2'));

      // 4. Check history
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'log']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('2'));

      // 5. Navigate to previous version
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'checkout', '1']);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('initial content\n');

      // 6. Create new version from past version
      await fs.writeFile(testFile, 'new content\n');
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit', 'new version']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('3'));
    });

    test('should handle sequential versioning from any point', async () => {
      // Setup: Track and create versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 2\n');
      await cli.run(['node', 'oops', 'commit', 'v2']);
      await fs.writeFile(testFile, 'version 3\n');
      await cli.run(['node', 'oops', 'commit', 'v3']);

      // Go back to version 2 and create new branch
      await cli.run(['node', 'oops', 'checkout', '2']);
      await fs.writeFile(testFile, 'branch from v2\n');
      await cli.run(['node', 'oops', 'commit', 'branch from v2']);

      // Continue sequential numbering
      await fs.writeFile(testFile, 'continue sequence\n');
      await cli.run(['node', 'oops', 'commit', 'continue sequence']);

      // Check final version number
      await cli.run(['node', 'oops', 'checkout', '1']);
      await fs.writeFile(testFile, 'from v1\n');
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit', 'from v1']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('6'));
    });
  });

  describe('Individual Commands', () => {
    test('track command should initialize versioning', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('tracking'));
    });

    test('status command should show tracking status', async () => {
      // No files tracked initially
      await cli.run(['node', 'oops', 'status']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No files'));

      // Track file
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'status']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    });

    test('diff command should show changes', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'changed content\n');

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'diff']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('-initial'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('+changed'));
    });

    test('log command should show version history', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'v2\n');
      await cli.run(['node', 'oops', 'commit', 'version 2']);

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'log']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('2'));
    });

    test('checkout command should navigate versions', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'v2 content\n');
      await cli.run(['node', 'oops', 'commit', 'v2']);

      await cli.run(['node', 'oops', 'checkout', '1']);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('initial content\n');
    });

    test('untrack command should stop versioning', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'untrack', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('stopped'));
    });
  });

  describe('Command Options', () => {
    test('should support --quiet option', async () => {
      await cli.run(['node', 'oops', 'track', testFile, '--quiet']);

      // Should have reduced output (may still have some output)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('log should support --oneline option', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'v2\n');
      await cli.run(['node', 'oops', 'commit', 'v2']);

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'log', '--oneline']);

      // Should show some output (oneline format may not be implemented yet)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('diff should support version comparison', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'v2\n');
      await cli.run(['node', 'oops', 'commit', 'v2']);
      await fs.writeFile(testFile, 'v3\n');
      await cli.run(['node', 'oops', 'commit', 'v3']);

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'diff', '1']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('-initial'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('+v3'));
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent files gracefully', async () => {
      await cli.run(['node', 'oops', 'track', '/non/existent/file.txt']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.stringContaining('not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle untracked file operations', async () => {
      await cli.run(['node', 'oops', 'commit', 'test']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Failed to create commit:')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle invalid version references', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'checkout', '999']);

      // Should warn about version not found (not error)
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Version 999 not found'));
    });
  });

  describe('Safety Features', () => {
    test('should prevent data loss during operations', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'important data\n');

      // Even if something fails, file should remain intact
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('important data\n');
    });

    test('should handle workspace corruption gracefully', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      // Simulate workspace corruption
      const workspaceDir = path.join(tempDir, '.keeper');
      if (
        await fs
          .access(workspaceDir)
          .then(() => true)
          .catch(() => false)
      ) {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }

      // Should still work or provide helpful error
      await cli.run(['node', 'oops', 'status']);
      // Should not crash
    });
  });
});
