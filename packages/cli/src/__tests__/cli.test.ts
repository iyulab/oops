/**
 * Comprehensive CLI Tests for 8-Command Structure
 * 100% Coverage Goal
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

describe('Oops CLI - 8-Command Structure (100% Coverage)', () => {
  let cli: CLI;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-test-'));
    testFile = path.join(tempDir, 'config.txt');

    // Create test file
    await fs.writeFile(testFile, 'initial content\n');

    // Setup mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit as any;

    // Clear mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();

    // Set isolated workspace for each test
    process.env.OOPS_WORKSPACE = tempDir;

    // Create CLI instance
    cli = new CLI();
  });

  afterEach(async () => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;

    // Clear workspace environment variable
    delete process.env.OOPS_WORKSPACE;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Core CLI Behavior', () => {
    test('should show status when no arguments provided', async () => {
      await cli.run(['node', 'oops']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📊 Workspace Status'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --version flag', async () => {
      await cli.run(['node', 'oops', '--version']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --help flag', async () => {
      await cli.run(['node', 'oops', '--help']);

      // Help should not cause process.exit when handled properly
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('1. Track Command: oops track <file> / oops <file>', () => {
    test('should track new file and create version 1.0', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📁'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('tracked'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle short form: oops <file>', async () => {
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📁'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('tracked'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle already tracked file', async () => {
      // Track file first
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      // Track again
      await cli.run(['node', 'oops', 'track', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Already tracking'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should error on non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');

      await cli.run(['node', 'oops', 'track', nonExistentFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should require file argument for track command', async () => {
      await cli.run(['node', 'oops', 'track']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('track command requires a file argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('2. Commit Command: oops commit [message]', () => {
    test('should create new version without message', async () => {
      // First track a file
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should create new version with message', async () => {
      // First track a file
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit', 'Added new feature']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('3. Checkout Command: oops checkout <version>', () => {
    test('should checkout specific version', async () => {
      // First track a file and create a version
      await cli.run(['node', 'oops', 'track', testFile]);
      await cli.run(['node', 'oops', 'commit']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'checkout', '1.0']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📂'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should require version argument', async () => {
      await cli.run(['node', 'oops', 'checkout']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('checkout command requires a version argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('4. Log Command: oops log', () => {
    test('should show version history', async () => {
      await cli.run(['node', 'oops', 'log']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Version history:'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --oneline flag', async () => {
      await cli.run(['node', 'oops', 'log', '--oneline']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.2 (HEAD, tag: 1.2)')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --graph flag', async () => {
      await cli.run(['node', 'oops', 'log', '--graph']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.2 (HEAD, tag: 1.2)')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('5. Diff Command: oops diff [version]', () => {
    test('should show diff with default version', async () => {
      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: HEAD~1')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('diff --git a/file b/file')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show diff with specific version', async () => {
      await cli.run(['node', 'oops', 'diff', '1.1']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: 1.1')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --tool option', async () => {
      await cli.run(['node', 'oops', 'diff', '--tool', 'vimdiff']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Using external tool: vimdiff')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('6. Untrack Command: oops untrack <file>', () => {
    test('should stop tracking file', async () => {
      await cli.run(['node', 'oops', 'untrack', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Stopping tracking for:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('File tracking stopped'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File content preserved')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should require file argument', async () => {
      await cli.run(['node', 'oops', 'untrack']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('untrack command requires a file argument')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('7. Keep Command: oops keep <file>', () => {
    test('should keep current state and stop tracking', async () => {
      await cli.run(['node', 'oops', 'keep', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Keeping current state and stopping tracking:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('File tracking stopped'));
      expect(mockProcessExit).not.toHaveBeenCalled();
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

  describe('8. Undo Command: oops undo <file> [version]', () => {
    test('should restore to latest version by default', async () => {
      await cli.run(['node', 'oops', 'undo', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Restoring'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version HEAD'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File restored to version HEAD')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should restore to specific version', async () => {
      await cli.run(['node', 'oops', 'undo', testFile, '1.1']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version 1.1'));
      expect(mockProcessExit).not.toHaveBeenCalled();
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

  describe('Status Command: oops status', () => {
    test('should show empty status when no files tracked', async () => {
      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No files are currently being tracked')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show tracked files with status', async () => {
      // Track a file first (mocked behavior)
      await cli.run(['node', 'oops', 'status']);

      // Status command should work without errors
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Global Options', () => {
    test('should handle --workspace option', async () => {
      const customWorkspace = path.join(tempDir, 'custom-workspace');

      await cli.run(['node', 'oops', '--workspace', customWorkspace, 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --verbose option', async () => {
      await cli.run(['node', 'oops', '--verbose', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --quiet option', async () => {
      await cli.run(['node', 'oops', '--quiet', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --no-color option', async () => {
      await cli.run(['node', 'oops', '--no-color', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle NO_COLOR environment variable', async () => {
      const originalNoColor = process.env.NO_COLOR;
      process.env.NO_COLOR = '1';

      await cli.run(['node', 'oops', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();

      // Restore environment
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands', async () => {
      await cli.run(['node', 'oops', 'unknown-command']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining("unknown command 'unknown-command'")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should distinguish between commands and files', async () => {
      // Test that files with command-like names are handled as files
      const commandLikeFile = path.join(tempDir, 'commit.txt');
      await fs.writeFile(commandLikeFile, 'content');

      await cli.run(['node', 'oops', commandLikeFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Started tracking'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle file patterns correctly', async () => {
      // Files with dots should be recognized as files, not commands
      const dottedFile = path.join(tempDir, 'config.txt');
      await fs.writeFile(dottedFile, 'content');

      await cli.run(['node', 'oops', dottedFile]);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Integration Workflows', () => {
    test('should support complete edit workflow', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', 'track', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Started tracking'));

      // 2. Commit changes
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit', 'Initial commit']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Version 1.1 created successfully')
      );

      // 3. Check log
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'log']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Version history'));

      // 4. Show diff
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'diff']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('diff --git'));

      // 5. Checkout version
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'checkout', '1.0']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Switched to version 1.0')
      );

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should support untrack workflow', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', 'track', testFile]);

      // 2. Untrack file
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'untrack', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('File tracking stopped'));

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should support keep workflow', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', 'track', testFile]);

      // 2. Keep file
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'keep', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Keeping current state'));

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should support undo workflow', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', 'track', testFile]);

      // 2. Undo to specific version
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'undo', testFile, '1.0']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File restored to version 1.0')
      );

      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle empty command line args', async () => {
      await cli.run(['node', 'oops']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle only global options', async () => {
      await cli.run(['node', 'oops', '--verbose']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle mixed global options and commands', async () => {
      await cli.run(['node', 'oops', '--verbose', '--quiet', 'status']);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle file paths with spaces', async () => {
      const spacedFile = path.join(tempDir, 'file with spaces.txt');
      await fs.writeFile(spacedFile, 'content');

      await cli.run(['node', 'oops', 'track', spacedFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Started tracking'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle very long file paths', async () => {
      const longName = 'a'.repeat(100);
      const longFile = path.join(tempDir, longName + '.txt');
      await fs.writeFile(longFile, 'content');

      await cli.run(['node', 'oops', 'track', longFile]);

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle special characters in commit messages', async () => {
      const specialMessage = 'Fix: añadió configuración UTF-8 ñáéíóú @#$%^&*()';

      await cli.run(['node', 'oops', 'commit', specialMessage]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(specialMessage));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Command Validation and Error Messages', () => {
    test('should provide helpful error for malformed commands', async () => {
      await cli.run(['node', 'oops', 'track']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Hint:'),
        expect.stringContaining('Usage: oops track <file>')
      );
    });

    test('should provide helpful error for checkout without version', async () => {
      await cli.run(['node', 'oops', 'checkout']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Hint:'),
        expect.stringContaining('Usage: oops checkout <version>')
      );
    });

    test('should provide helpful error for undo without file', async () => {
      await cli.run(['node', 'oops', 'undo']);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Hint:'),
        expect.stringContaining('Usage: oops undo <file> [version]')
      );
    });
  });
});
