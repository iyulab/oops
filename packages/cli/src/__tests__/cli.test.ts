/**
 * CLI Test Suite - Testing the 5-command Oops CLI
 * Commands: oops <file>, status, diff, keep, undo
 */

import { CLI } from '../cli';
import * as path from 'path';
import * as os from 'os';

// Mock console output and process.exit
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();

// Mock process.exit
Object.defineProperty(process, 'exit', {
  value: mockProcessExit,
  writable: true,
});

describe('Oops CLI - 5-Command Interface', () => {
  let cli: CLI;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    cli = new CLI();

    // Set up console spies
    jest.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    jest.spyOn(console, 'error').mockImplementation(mockConsoleError);

    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    // Create test environment
    tempDir = path.join(
      os.tmpdir(),
      `oops-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
    const fs = await import('fs/promises');
    await fs.mkdir(tempDir, { recursive: true });

    testFile = path.join(tempDir, 'config.txt');
    await fs.writeFile(testFile, 'original content\n');

    process.chdir(tempDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Core CLI Behavior', () => {
    test('should show status when no arguments provided', async () => {
      await cli.run(['node', 'oops']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --version flag', async () => {
      await cli.run(['node', 'oops', '--version']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+/));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --help flag', async () => {
      await cli.run(['node', 'oops', '--help']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('1. File Tracking: oops <file>', () => {
    test('should track new file and create backup', async () => {
      await cli.run(['node', 'oops', 'config.txt']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Backup created for config.txt')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle already tracked file', async () => {
      // Track file first
      await cli.run(['node', 'oops', 'config.txt']);
      mockConsoleLog.mockClear();

      // Track again
      await cli.run(['node', 'oops', 'config.txt']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Already tracking'));
    });

    test('should error on non-existent file', async () => {
      await cli.run(['node', 'oops', 'nonexistent.txt']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle absolute file paths', async () => {
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Backup created for config.txt')
      );
    });
  });

  describe('2. Status Command: oops status', () => {
    test('should show empty status when no files tracked', async () => {
      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No files being tracked')
      );
    });

    test('should show tracked files with status', async () => {
      // Track a file first
      await cli.run(['node', 'oops', 'config.txt']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));
    });
  });

  describe('3. Diff Command: oops diff <file>', () => {
    test('should show diff for modified file', async () => {
      // Track file
      await cli.run(['node', 'oops', 'config.txt']);

      // Modify file
      const fs = await import('fs/promises');
      await fs.writeFile(testFile, 'modified content\n');

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'diff', 'config.txt']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Changes in'));
    });

    test('should require file argument', async () => {
      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('diff command requires a file argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle untracked file', async () => {
      await cli.run(['node', 'oops', 'diff', 'config.txt']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] No workspace found')
      );
    });
  });

  describe('4. Keep Command: oops keep <file>', () => {
    test('should keep changes and stop tracking', async () => {
      // Track and modify file
      await cli.run(['node', 'oops', 'config.txt']);
      const fs = await import('fs/promises');
      await fs.writeFile(testFile, 'modified content\n');

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'keep', 'config.txt']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Changes applied successfully')
      );
    });

    test('should require file argument', async () => {
      await cli.run(['node', 'oops', 'keep']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('keep command requires a file argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('5. Undo Command: oops undo <file>', () => {
    test('should revert changes and stop tracking', async () => {
      // Track and modify file
      await cli.run(['node', 'oops', 'config.txt']);
      const fs = await import('fs/promises');
      await fs.writeFile(testFile, 'modified content\n');

      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'undo', 'config.txt']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File reverted to backup successfully')
      );
    });

    test('should require file argument', async () => {
      await cli.run(['node', 'oops', 'undo']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('undo command requires a file argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Global Options', () => {
    test('should handle --workspace option', async () => {
      const customWorkspace = path.join(tempDir, 'custom-workspace');

      await cli.run(['node', 'oops', '--workspace', customWorkspace, 'config.txt']);

      expect(mockProcessExit).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Backup created'));
    });

    test('should handle --verbose option', async () => {
      await cli.run(['node', 'oops', '--verbose', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --quiet option', async () => {
      await cli.run(['node', 'oops', '--quiet', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --yes option', async () => {
      await cli.run(['node', 'oops', '--yes', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle NO_COLOR environment variable', async () => {
      process.env.NO_COLOR = '1';

      await cli.run(['node', 'oops', 'config.txt']);

      expect(mockProcessExit).not.toHaveBeenCalled();

      delete process.env.NO_COLOR;
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands', async () => {
      await cli.run(['node', 'oops', 'unknown-command']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('unknown command')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should distinguish between commands and files', async () => {
      // Create a file named 'status'
      const statusFile = path.join(tempDir, 'status');
      const fs = await import('fs/promises');
      await fs.writeFile(statusFile, 'status file content');

      // This should run status command, not track the file
      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));
    });

    test('should handle file patterns correctly', async () => {
      // Test that files starting with dash are not treated as files
      await cli.run(['node', 'oops', '--verbose']);

      expect(mockConsoleError).not.toHaveBeenCalledWith(expect.stringContaining('File not found'));
    });
  });

  describe('Integration Workflow', () => {
    test('should support complete edit workflow', async () => {
      const fs = await import('fs/promises');

      // 1. Start tracking
      await cli.run(['node', 'oops', 'config.txt']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Backup created'));

      // 2. Modify file
      await fs.writeFile(testFile, 'new content\n');

      // 3. Check diff
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'diff', 'config.txt']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Changes in'));

      // 4. Check status
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'status']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));

      // 5. Keep changes
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'keep', 'config.txt']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Changes applied successfully')
      );
    });

    test('should support undo workflow', async () => {
      const fs = await import('fs/promises');

      // 1. Start tracking
      await cli.run(['node', 'oops', 'config.txt']);

      // 2. Modify file
      await fs.writeFile(testFile, 'unwanted changes\n');

      // 3. Undo changes
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'undo', 'config.txt']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File reverted to backup successfully')
      );

      // 4. Verify original content restored
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('original content\n');
    });
  });
});
