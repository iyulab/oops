/**
 * SimpleCLI Individual Handler Tests - Core Purpose Alignment
 * Tests the SimpleCLI command handlers for the 5 essential commands
 */

import { SimpleCLI } from '../simple-cli';
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

describe('SimpleCLI Command Handler Tests', () => {
  let tempDir: string;
  let testFile: string;
  let cli: SimpleCLI;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-cmd-test-'));
    testFile = path.join(tempDir, 'test.txt');

    // Create test file
    await fs.writeFile(testFile, 'test content\n');

    // Set isolated workspace for each test
    process.env.OOPS_WORKSPACE = tempDir;

    // Disable colors for testing to avoid ANSI codes in assertions
    process.env.NO_COLOR = '1';

    // Setup mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit as any;

    // Clear mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    // Create SimpleCLI instance
    cli = new SimpleCLI();
  });

  afterEach(async () => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;

    // Clear workspace and color environment variables
    delete process.env.OOPS_WORKSPACE;
    delete process.env.NO_COLOR;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Track Handler: oops <file>', () => {
    test('should track new file successfully', async () => {
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Backup created automatically')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Your file is now protected!')
      );
    });

    test('should show status for already tracked clean file', async () => {
      // Track file first
      await cli.run(['node', 'oops', testFile]);
      mockConsoleLog.mockClear();

      // Track again
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Already tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Clean'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Edit the file, then use:')
      );
    });

    test('should show guidance for already tracked modified file', async () => {
      // Track file first
      await cli.run(['node', 'oops', testFile]);

      // Modify file
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      // Track again
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Already tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Modified'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops diff'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops keep'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops undo'));
    });

    test('should handle non-existent file gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');

      await cli.run(['node', 'oops', nonExistentFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Status Handler: oops status', () => {
    test('should show empty status with no tracked files', async () => {
      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith('No files being tracked');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Start tracking a file with: oops <file>')
      );
    });

    test('should show tracked files with clean status', async () => {
      // Track a file first
      await cli.run(['node', 'oops', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Tracked files (1):'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ clean'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    });

    test('should show modified status for changed files', async () => {
      // Track file first
      await cli.run(['node', 'oops', testFile]);

      // Modify file
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📝 modified'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops diff'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops keep'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('oops undo'));
    });
  });

  describe('Diff Handler: oops diff [file]', () => {
    test('should show no changes for clean tracked file', async () => {
      // Track file but don't modify it
      await cli.run(['node', 'oops', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleLog).toHaveBeenCalledWith('No changes detected');
    });

    test('should show diff for modified file', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('-'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('+'));
    });

    test('should show diff for specific file', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('-'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('+'));
    });

    test('should error for untracked file', async () => {
      await cli.run(['node', 'oops', 'diff', testFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File is not being tracked')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Keep Handler: oops keep <file>', () => {
    test('should keep changes and stop tracking', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'keep', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Kept changes'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('no longer tracked'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('changes are now permanent')
      );
    });

    test('should error when no file provided', async () => {
      await cli.run(['node', 'oops', 'keep']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('Usage: oops keep <file>')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should error when file not tracked', async () => {
      await cli.run(['node', 'oops', 'keep', testFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File is not being tracked')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Undo Handler: oops undo <file>', () => {
    test('should restore file from backup and stop tracking', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'undo', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🔄 Restored'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('from backup'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('no longer tracked'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('changes have been reverted')
      );
    });

    test('should error when no file provided', async () => {
      await cli.run(['node', 'oops', 'undo']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('Usage: oops undo <file>')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should error when file not tracked', async () => {
      await cli.run(['node', 'oops', 'undo', testFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File is not being tracked')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Integration Tests', () => {
    test('should support complete workflow: track → modify → diff → keep', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));

      // 2. Check status
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'status']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ clean'));

      // 3. Modify file
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      // 4. Check diff
      await cli.run(['node', 'oops', 'diff']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('test.txt'));

      // 5. Keep changes
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'keep', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Kept changes'));
    });

    test('should support complete workflow: track → modify → diff → undo', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));

      // 2. Modify file
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      // 3. Check diff
      await cli.run(['node', 'oops', 'diff']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('test.txt'));

      // 4. Undo changes
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'undo', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🔄 Restored'));
    });

    test('should handle error propagation correctly', async () => {
      // Test error in track command
      const nonExistentFile = path.join(tempDir, 'missing.txt');
      await cli.run(['node', 'oops', nonExistentFile]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File not found')
      );

      // Test error in keep command with untracked file
      mockConsoleError.mockClear();
      await cli.run(['node', 'oops', 'keep', testFile]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File is not being tracked')
      );
    });

    test('should handle concurrent operations', async () => {
      // Track file
      await cli.run(['node', 'oops', testFile]);
      mockConsoleLog.mockClear();

      // Multiple status commands should work
      await Promise.all([
        cli.run(['node', 'oops', 'status']),
        cli.run(['node', 'oops', 'status']),
        cli.run(['node', 'oops', 'status']),
      ]);

      // Each should show the tracked file
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ clean'));
    });
  });
});
