/**
 * Individual Command Tests - Based on Real Implementation
 * Tests each command class directly for 100% coverage
 */

import {
  TrackCommand,
  CommitCommand,
  CheckoutCommand,
  LogCommand,
  DiffCommand,
  UntrackCommand,
  KeepCommand,
  UndoCommand,
  StatusCommand,
} from '../commands';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

// Store original methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Individual Command Tests - Real Implementation', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-cmd-test-'));
    testFile = path.join(tempDir, 'test.txt');

    // Create test file
    await fs.writeFile(testFile, 'test content\n');

    // Set isolated workspace for each test
    process.env.OOPS_WORKSPACE = tempDir;

    // Setup mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Clear mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(async () => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Clear workspace environment variable
    delete process.env.OOPS_WORKSPACE;

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('TrackCommand', () => {
    let command: TrackCommand;

    beforeEach(() => {
      command = new TrackCommand();
    });

    test('should validate with valid file argument', async () => {
      await expect(command.validate([testFile])).resolves.toBeUndefined();
    });

    test('should reject validation without file argument', async () => {
      await expect(command.validate([])).rejects.toThrow('Usage: oops <file>');
    });

    test('should reject validation with multiple file arguments', async () => {
      await expect(command.validate([testFile, 'another.txt'])).rejects.toThrow(
        'Usage: oops <file>'
      );
    });

    test('should execute successfully for existing file', async () => {
      await expect(command.execute([testFile])).resolves.toBeUndefined();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✨ Creating temporary workspace')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Started tracking'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Created version 1.0'));
    });

    test('should show status for already tracked file', async () => {
      // Track file first
      await command.execute([testFile]);
      mockConsoleLog.mockClear();

      // Track again
      await command.execute([testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 test.txt - Already tracking')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Current version: 1.0'));
    });

    test('should handle non-existent file gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');

      await expect(command.execute([nonExistentFile])).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to track file'),
        expect.stringContaining('File not found')
      );
    });
  });

  describe('StatusCommand', () => {
    let command: StatusCommand;

    beforeEach(() => {
      command = new StatusCommand();
    });

    test('should validate with no arguments', async () => {
      await expect(command.validate([])).resolves.toBeUndefined();
    });

    test('should reject validation with file arguments', async () => {
      await expect(command.validate([testFile])).rejects.toThrow(
        'status command does not accept arguments'
      );
    });

    test('should execute and show empty workspace', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();

      expect(mockConsoleLog).toHaveBeenCalledWith('Workspace: Not initialized');
      expect(mockConsoleLog).toHaveBeenCalledWith('No files being tracked');
    });

    test('should execute and show tracked files', async () => {
      // Track a file first
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Workspace:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Tracked files (1)'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ clean'));
    });

    test('should show modified status for changed files', async () => {
      // Track file first
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);

      // Modify file
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📝 modified'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('v1.0+'));
    });
  });

  describe('CommitCommand', () => {
    let command: CommitCommand;

    beforeEach(() => {
      command = new CommitCommand();
    });

    test('should validate with no arguments', async () => {
      await expect(command.validate([])).resolves.toBeUndefined();
    });

    test('should validate with message argument', async () => {
      await expect(command.validate(['test message'])).resolves.toBeUndefined();
    });

    test('should execute with no changes', async () => {
      // Track file but don't modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Nothing to commit'));
    });

    test('should execute with changes', async () => {
      // Track file and modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
    });

    test('should execute with message', async () => {
      // Track file and modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await expect(command.execute(['Added feature'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));
    });

    test('should handle no workspace', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No workspace found'));
    });
  });

  describe('LogCommand', () => {
    let command: LogCommand;

    beforeEach(() => {
      command = new LogCommand();
    });

    test('should validate with no arguments', async () => {
      await expect(command.validate([])).resolves.toBeUndefined();
    });

    test('should validate with options', async () => {
      await expect(command.validate(['--oneline', '--graph'])).resolves.toBeUndefined();
    });

    test('should execute with no workspace', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No workspace found'));
    });

    test('should execute with no tracked files', async () => {
      // Create workspace but no tracked files
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      const untrackCommand = new UntrackCommand();
      await untrackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await command.execute([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No files being tracked')
      );
    });

    test('should execute with tracked files', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute(['Version 1.1']);
      mockConsoleLog.mockClear();

      await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalledWith('Version history:');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📁 test.txt:'));
    });

    test('should execute with --oneline option', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute(['Version 1.1']);
      mockConsoleLog.mockClear();

      await command.execute(['--oneline']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.1 (HEAD, tag: 1.1)')
      );
    });

    test('should execute with --graph option', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute(['Version 1.1']);
      mockConsoleLog.mockClear();

      await command.execute(['--graph']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.1 (HEAD, tag: 1.1)')
      );
    });

    test('should execute with multiple options', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute(['Version 1.1']);
      mockConsoleLog.mockClear();

      await command.execute(['--oneline', '--graph', '--decorate']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.1 (HEAD, tag: 1.1)')
      );
    });
  });

  describe('DiffCommand', () => {
    let command: DiffCommand;

    beforeEach(() => {
      command = new DiffCommand();
    });

    test('should validate with no arguments', async () => {
      await expect(command.validate([])).resolves.toBeUndefined();
    });

    test('should validate with version argument', async () => {
      await expect(command.validate(['1.0'])).resolves.toBeUndefined();
    });

    test('should reject validation with multiple version arguments', async () => {
      await expect(command.validate(['1.0', '1.1'])).rejects.toThrow(
        'diff command takes at most one version argument'
      );
    });

    test('should execute with no workspace', async () => {
      await expect(command.execute([])).rejects.toThrow('No workspace found');
    });

    test('should execute with no tracked files', async () => {
      // Create workspace but no tracked files
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      const untrackCommand = new UntrackCommand();
      await untrackCommand.execute([testFile]);

      await expect(command.execute([])).rejects.toThrow('No files being tracked');
    });

    test('should execute with no changes', async () => {
      // Track file but don't modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: HEAD~1')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No changes detected'));
    });

    test('should execute with changes', async () => {
      // Track file and modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: HEAD~1')
      );
    });

    test('should execute with specific version', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      mockConsoleLog.mockClear();

      await command.execute(['1.0']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: 1.0')
      );
    });

    test('should handle --tool option', async () => {
      // Track file and modify it
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      mockConsoleLog.mockClear();

      await command.execute(['--tool', 'code']);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Using external tool: code')
      );
    });

    test('should show Git-style diff output for changes', async () => {
      // Track file, commit, and modify again
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      await fs.writeFile(testFile, 'version 1.2 content\n');
      mockConsoleLog.mockClear();

      await command.execute([]);

      // Should show Git-style diff format
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('diff --git a/test.txt b/test.txt')
      );
    });
  });

  describe('CheckoutCommand', () => {
    let command: CheckoutCommand;

    beforeEach(() => {
      command = new CheckoutCommand();
    });

    test('should validate with version argument', async () => {
      await expect(command.validate(['1.0'])).resolves.toBeUndefined();
    });

    test('should reject validation without version argument', async () => {
      await expect(command.validate([])).rejects.toThrow(
        'checkout command requires a version argument'
      );
    });

    test('should execute with valid version', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      mockConsoleLog.mockClear();

      await expect(command.execute(['1.0'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📂'));
    });

    test('should handle various version formats', async () => {
      // Track file and create versions
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'version 1.1 content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      mockConsoleLog.mockClear();

      // Test different version formats
      await expect(command.execute(['HEAD'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📂'));
    });

    test('should handle no workspace', async () => {
      await expect(command.execute(['1.0'])).rejects.toThrow('No workspace found');
    });

    test('should handle no tracked files', async () => {
      // Create workspace but no tracked files
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      const untrackCommand = new UntrackCommand();
      await untrackCommand.execute([testFile]);

      await expect(command.execute(['1.0'])).rejects.toThrow('No files being tracked');
    });
  });

  describe('UntrackCommand', () => {
    let command: UntrackCommand;

    beforeEach(() => {
      command = new UntrackCommand();
    });

    test('should validate with file argument', async () => {
      await expect(command.validate([testFile])).resolves.toBeUndefined();
    });

    test('should reject validation without file argument', async () => {
      await expect(command.validate([])).rejects.toThrow(
        'untrack command requires a file argument'
      );
    });

    test('should execute successfully', async () => {
      // Track file first
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️'));
    });

    test('should handle untracked file', async () => {
      // Don't track file first
      await expect(command.execute([testFile])).rejects.toThrow();
    });
  });

  describe('KeepCommand', () => {
    let command: KeepCommand;

    beforeEach(() => {
      command = new KeepCommand();
    });

    test('should validate with file argument', async () => {
      await expect(command.validate([testFile])).resolves.toBeUndefined();
    });

    test('should reject validation without file argument', async () => {
      await expect(command.validate([])).rejects.toThrow('keep command requires a file argument');
    });

    test('should execute successfully (alias for untrack)', async () => {
      // Track file first
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️'));
    });
  });

  describe('UndoCommand', () => {
    let command: UndoCommand;

    beforeEach(() => {
      command = new UndoCommand();
    });

    test('should validate with file argument', async () => {
      await expect(command.validate([testFile])).resolves.toBeUndefined();
    });

    test('should validate with file and version arguments', async () => {
      await expect(command.validate([testFile, '1.0'])).resolves.toBeUndefined();
    });

    test('should reject validation without file argument', async () => {
      await expect(command.validate([])).rejects.toThrow('undo command requires a file argument');
    });

    test('should execute with default version (latest)', async () => {
      // Track file and create version history
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      await fs.writeFile(testFile, 'more changes\n');
      mockConsoleLog.mockClear();

      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Restoring'));
    });

    test('should execute with specific version', async () => {
      // Track file and create version history
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      await fs.writeFile(testFile, 'modified content\n');
      const commitCommand = new CommitCommand();
      await commitCommand.execute([]);
      mockConsoleLog.mockClear();

      await expect(command.execute([testFile, '1.0'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version 1.0'));
    });

    test('should handle untracked file', async () => {
      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File is not being tracked')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Nothing to undo'));
    });

    test('should handle multiple arguments', async () => {
      // Track file first
      const trackCommand = new TrackCommand();
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await expect(command.execute([testFile, '1.0', 'extra'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version 1.0'));
    });
  });

  describe('Integration Tests', () => {
    test('should support complete workflow with all commands', async () => {
      const trackCommand = new TrackCommand();
      const statusCommand = new StatusCommand();
      const commitCommand = new CommitCommand();
      const logCommand = new LogCommand();
      const diffCommand = new DiffCommand();
      const checkoutCommand = new CheckoutCommand();
      const untrackCommand = new UntrackCommand();

      // 1. Track file
      await trackCommand.execute([testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Created version 1.0'));

      // 2. Check status
      mockConsoleLog.mockClear();
      await statusCommand.execute([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ clean'));

      // 3. Modify and commit
      await fs.writeFile(testFile, 'version 1.1 content\n');
      mockConsoleLog.mockClear();
      await commitCommand.execute(['Version 1.1']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('💾'));

      // 4. Check log
      mockConsoleLog.mockClear();
      await logCommand.execute([]);
      expect(mockConsoleLog).toHaveBeenCalledWith('Version history:');

      // 5. Modify again and check diff
      await fs.writeFile(testFile, 'version 1.2 content\n');
      mockConsoleLog.mockClear();
      await diffCommand.execute([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version')
      );

      // 6. Checkout earlier version
      mockConsoleLog.mockClear();
      await checkoutCommand.execute(['1.0']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📂'));

      // 7. Untrack file
      mockConsoleLog.mockClear();
      await untrackCommand.execute([testFile]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️'));
    });

    test('should handle error propagation correctly', async () => {
      const trackCommand = new TrackCommand();
      const commitCommand = new CommitCommand();

      // Test error in track command
      const nonExistentFile = path.join(tempDir, 'missing.txt');
      await expect(trackCommand.execute([nonExistentFile])).rejects.toThrow();

      // Test error in commit command with no changes
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      await commitCommand.execute([]);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Nothing to commit'));
    });

    test('should handle concurrent command operations', async () => {
      const trackCommand = new TrackCommand();
      const statusCommand = new StatusCommand();

      // Track file
      await trackCommand.execute([testFile]);
      mockConsoleLog.mockClear();

      // Multiple status commands should work
      await Promise.all([
        statusCommand.execute([]),
        statusCommand.execute([]),
        statusCommand.execute([]),
      ]);

      // Each should show the tracked file
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ clean'));
    });
  });
});
