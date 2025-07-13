/**
 * CLI Integration Tests - Based on Actual Implementation
 * Tests the full CLI interface against real functionality
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

describe('Oops CLI - Real Implementation Tests', () => {
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

      expect(mockConsoleLog).toHaveBeenCalledWith('Workspace: Not initialized');
      expect(mockConsoleLog).toHaveBeenCalledWith('No files being tracked');
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

  describe('Track Command: oops track <file> / oops <file>', () => {
    test('should track new file and create version 1.0', async () => {
      await cli.run(['node', 'oops', 'track', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✨ Creating temporary workspace')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Created version 1.0'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle short form: oops <file>', async () => {
      await cli.run(['node', 'oops', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Created version 1.0'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show status for already tracked file', async () => {
      // Track file first
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      // Track again
      await cli.run(['node', 'oops', 'track', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 config.txt - Already tracking')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Current version: 1.0'));
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
        expect.stringContaining('Usage: oops <file>')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Status Command: oops status', () => {
    test('should show empty status with no tracked files', async () => {
      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Workspace: Not initialized');
      expect(mockConsoleLog).toHaveBeenCalledWith('No files being tracked');
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show tracked files with versions', async () => {
      // Track a file first
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Tracked files (1)'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ clean'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('config.txt'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show modified status after file changes', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'status']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📝 modified'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('v1.0+'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Commit Command: oops commit [message]', () => {
    test('should commit changes without message', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should commit changes with message', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit', 'Added new feature']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle no changes to commit', async () => {
      // Track file but don't modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Nothing to commit'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Log Command: oops log', () => {
    test('should show version history', async () => {
      // Track file and create versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      await cli.run(['node', 'oops', 'commit', 'Version 1.1']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'log']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Version history:');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📁 config.txt:'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --oneline flag', async () => {
      // Track file and create versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      await cli.run(['node', 'oops', 'commit', 'Version 1.1']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'log', '--oneline']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.1 (HEAD, tag: 1.1)')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle --graph flag', async () => {
      // Track file and create versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      await cli.run(['node', 'oops', 'commit', 'Version 1.1']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'log', '--graph']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.1 (HEAD, tag: 1.1)')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Diff Command: oops diff [version]', () => {
    test('should show diff for modified files', async () => {
      // Track file and modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: HEAD~1')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should show no diff for unmodified files', async () => {
      // Track file but don't modify it
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No changes detected'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle Git-style diff output', async () => {
      // Track file, modify, and commit to create version history
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      await cli.run(['node', 'oops', 'commit']);
      await fs.writeFile(testFile, 'version 1.2 content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'diff']);

      // Should show Git-style diff format
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('diff --git'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Checkout Command: oops checkout <version>', () => {
    test('should checkout specific version', async () => {
      // Track file and create multiple versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
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

  describe('Untrack Command: oops untrack <file>', () => {
    test('should untrack file successfully', async () => {
      // Track file first
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'untrack', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️'));
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

  describe('Keep Command: oops keep <file>', () => {
    test('should keep file (alias for untrack)', async () => {
      // Track file first
      await cli.run(['node', 'oops', 'track', testFile]);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'keep', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Undo Command: oops undo <file> [version]', () => {
    test('should undo to latest version', async () => {
      // Track file and create version history
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      await cli.run(['node', 'oops', 'commit']);
      await fs.writeFile(testFile, 'more changes\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'undo', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Restoring'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should undo to specific version', async () => {
      // Track file and create version history
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      await cli.run(['node', 'oops', 'commit']);
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'undo', testFile, '1.0']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version 1.0'));
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

  describe('Complete Workflows', () => {
    test('should support complete track → commit → log workflow', async () => {
      // 1. Track file
      await cli.run(['node', 'oops', 'track', testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));

      // 2. Modify and commit
      await fs.writeFile(testFile, 'version 1.1 content\n');
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit', 'Version 1.1']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));

      // 3. Check log
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'log']);
      expect(mockConsoleLog).toHaveBeenCalledWith('Version history:');

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should support branching workflow', async () => {
      // Track and create versions
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'version 1.1\n');
      await cli.run(['node', 'oops', 'commit']);
      await fs.writeFile(testFile, 'version 1.2\n');
      await cli.run(['node', 'oops', 'commit']);

      // Checkout earlier version and create branch
      await cli.run(['node', 'oops', 'checkout', '1.1']);
      await fs.writeFile(testFile, 'branch version\n');
      mockConsoleLog.mockClear();
      await cli.run(['node', 'oops', 'commit']);

      // Should create branch version (like 1.1.1)
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands gracefully', async () => {
      await cli.run(['node', 'oops', 'unknown-command']);

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle file permission errors', async () => {
      // This test might be platform-specific
      const invalidPath = path.join(tempDir, 'invalid/path/file.txt');

      await cli.run(['node', 'oops', 'track', invalidPath]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('File not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle files with spaces in names', async () => {
      const spacedFile = path.join(tempDir, 'file with spaces.txt');
      await fs.writeFile(spacedFile, 'content\n');

      await cli.run(['node', 'oops', 'track', spacedFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle special characters in commit messages', async () => {
      const specialMessage = 'Fix: añadió configuración UTF-8 ñáéíóú @#$%^&*()';

      // Track file first
      await cli.run(['node', 'oops', 'track', testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await cli.run(['node', 'oops', 'commit', specialMessage]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle very long file paths', async () => {
      const longPath = path.join(
        tempDir,
        'very-long-directory-name-that-exceeds-normal-limits',
        'file.txt'
      );

      // Create directory structure
      await fs.mkdir(path.dirname(longPath), { recursive: true });
      await fs.writeFile(longPath, 'content\n');

      await cli.run(['node', 'oops', 'track', longPath]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });
});
