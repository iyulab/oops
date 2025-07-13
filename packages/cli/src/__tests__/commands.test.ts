/**
 * Individual Command Tests for 100% Coverage
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

describe('Individual Command Tests (100% Coverage)', () => {
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
      await expect(command.validate([testFile, 'file2.txt'])).rejects.toThrow('Usage: oops <file>');
    });

    test('should execute successfully for existing file', async () => {
      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Started tracking'));
    });

    test('should handle non-existent file gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'missing.txt');
      await expect(command.execute([nonExistentFile])).rejects.toThrow('File not found');
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

    test('should execute without message', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Creating version checkpoint')
      );
    });

    test('should execute with message', async () => {
      await expect(command.execute(['test commit message'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('  Message: test commit message')
      );
    });
  });

  describe('CheckoutCommand', () => {
    let command: CheckoutCommand;

    beforeEach(() => {
      command = new CheckoutCommand();
    });

    test('should validate with version argument', async () => {
      await expect(command.validate(['1.1'])).resolves.toBeUndefined();
    });

    test('should reject validation without version argument', async () => {
      await expect(command.validate([])).rejects.toThrow(
        'checkout command requires a version argument'
      );
    });

    test('should execute with valid version', async () => {
      await expect(command.execute(['1.1'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Checking out version 1.1')
      );
    });

    test('should handle various version formats', async () => {
      const versions = ['1.0', '1.2.3', 'HEAD', '1.1.1.1'];

      for (const version of versions) {
        mockConsoleLog.mockClear();
        await expect(command.execute([version])).resolves.toBeUndefined();
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining(`Checking out version ${version}`)
        );
      }
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

    test('should execute with default format', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Version history:'));
    });

    test('should execute with --oneline option', async () => {
      await expect(command.execute(['--oneline'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.2 (HEAD, tag: 1.2)')
      );
    });

    test('should execute with --graph option', async () => {
      await expect(command.execute(['--graph'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.2 (HEAD, tag: 1.2)')
      );
    });

    test('should execute with multiple options', async () => {
      await expect(
        command.execute(['--oneline', '--graph', '--decorate'])
      ).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('* 1.2 (HEAD, tag: 1.2)')
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
      await expect(command.validate(['1.1'])).resolves.toBeUndefined();
    });

    test('should reject validation with multiple version arguments', async () => {
      await expect(command.validate(['1.1', '1.2'])).rejects.toThrow(
        'diff command takes at most one version argument'
      );
    });

    test('should execute with default version', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: HEAD~1')
      );
    });

    test('should execute with specific version', async () => {
      await expect(command.execute(['1.1'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comparing with version: 1.1')
      );
    });

    test('should handle --tool option', async () => {
      await expect(command.execute(['--tool', 'vimdiff'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Using external tool: vimdiff')
      );
    });

    test('should show Git-style diff output', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('diff --git a/file b/file')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('index 1234567..abcdefg 100644')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('--- a/file'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('+++ b/file'));
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
      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Stopping tracking for:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('File tracking stopped'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File content preserved')
      );
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
      await expect(command.validate([])).rejects.toThrow(
        'untrack command requires a file argument'
      );
    });

    test('should execute successfully', async () => {
      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Keeping current state and stopping tracking:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('File tracking stopped'));
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
      await expect(command.validate([testFile, '1.1'])).resolves.toBeUndefined();
    });

    test('should reject validation without file argument', async () => {
      await expect(command.validate([])).rejects.toThrow('undo command requires a file argument');
    });

    test('should execute with default version (HEAD)', async () => {
      await expect(command.execute([testFile])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Restoring'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version HEAD'));
    });

    test('should execute with specific version', async () => {
      await expect(command.execute([testFile, '1.1'])).resolves.toBeUndefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('to version 1.1'));
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

    test('should execute successfully', async () => {
      await expect(command.execute([])).resolves.toBeUndefined();
      // Status command may show workspace info or tracked files
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle command execution errors gracefully', async () => {
      const command = new TrackCommand();

      // Force an error by passing non-existent file
      const nonExistentFile = '/absolutely/non/existent/path/file.txt';
      await expect(command.execute([nonExistentFile])).rejects.toThrow();
    });

    test('should handle various file path formats', async () => {
      const command = new TrackCommand();

      // Test different path formats
      const paths = ['./relative/path.txt', '../parent/path.txt', '/absolute/path.txt'];

      for (const testPath of paths) {
        // These should not throw validation errors
        await expect(command.validate([testPath])).resolves.toBeUndefined();
      }
    });

    test('should handle special characters in file paths', async () => {
      const specialFile = path.join(tempDir, 'file with spaces & special chars #@$.txt');
      await fs.writeFile(specialFile, 'content');

      const command = new TrackCommand();
      await expect(command.validate([specialFile])).resolves.toBeUndefined();
      await expect(command.execute([specialFile])).resolves.toBeUndefined();
    });

    test('should handle empty version strings', async () => {
      const command = new CheckoutCommand();

      await expect(command.validate([''])).resolves.toBeUndefined();
      await expect(command.execute([''])).resolves.toBeUndefined();
    });

    test('should handle very long commit messages', async () => {
      const command = new CommitCommand();
      const longMessage = 'A'.repeat(1000);

      await expect(command.validate([longMessage])).resolves.toBeUndefined();
      await expect(command.execute([longMessage])).resolves.toBeUndefined();
    });
  });

  describe('Command Instance Creation', () => {
    test('should create all command instances without errors', () => {
      expect(() => new TrackCommand()).not.toThrow();
      expect(() => new CommitCommand()).not.toThrow();
      expect(() => new CheckoutCommand()).not.toThrow();
      expect(() => new LogCommand()).not.toThrow();
      expect(() => new DiffCommand()).not.toThrow();
      expect(() => new UntrackCommand()).not.toThrow();
      expect(() => new KeepCommand()).not.toThrow();
      expect(() => new UndoCommand()).not.toThrow();
      expect(() => new StatusCommand()).not.toThrow();
    });

    test('should have correct inheritance structure', () => {
      const commands = [
        new TrackCommand(),
        new CommitCommand(),
        new CheckoutCommand(),
        new LogCommand(),
        new DiffCommand(),
        new UntrackCommand(),
        new KeepCommand(),
        new UndoCommand(),
        new StatusCommand(),
      ];

      commands.forEach(command => {
        expect(command).toHaveProperty('validate');
        expect(command).toHaveProperty('execute');
        expect(typeof command.validate).toBe('function');
        expect(typeof command.execute).toBe('function');
      });
    });
  });
});
