/**
 * Comprehensive test suite for CLI functionality
 */

import { CLI } from '../cli';
import * as path from 'path';
import * as os from 'os';

// Mock console to capture output
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();

jest.mock('console', () => ({
  log: mockConsoleLog,
  error: mockConsoleError
}));

// Mock process.exit
Object.defineProperty(process, 'exit', {
  value: mockProcessExit,
  writable: true
});

describe('CLI', () => {
  let cli: CLI;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    cli = new CLI();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
    
    // Create temporary directory and test file
    tempDir = path.join(os.tmpdir(), `cli-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const fs = await import('fs/promises');
    await fs.mkdir(tempDir, { recursive: true });
    
    testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'Hello World');
    
    // Change to temp directory for tests
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Clean up
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic CLI Operations', () => {
    test('should show help when no arguments provided', async () => {
      await cli.run(['node', 'oops']);
      
      // Should show status (default behavior)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle version command', async () => {
      await cli.run(['node', 'oops', '--version']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle help command', async () => {
      await cli.run(['node', 'oops', '--help']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('File Tracking Commands', () => {
    test('should handle oops <file> pattern', async () => {
      await cli.run(['node', 'oops', 'test.txt']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Backup created for test.txt')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle diff command', async () => {
      // First track the file
      await cli.run(['node', 'oops', 'test.txt']);
      mockConsoleLog.mockClear();
      
      // Modify the file
      const fs = await import('fs/promises');
      await fs.writeFile(testFile, 'Hello Modified World');
      
      // Run diff
      await cli.run(['node', 'oops', 'diff', 'test.txt']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Changes in')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle status command', async () => {
      await cli.run(['node', 'oops', 'status']);
      
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle keep command', async () => {
      // First track the file
      await cli.run(['node', 'oops', 'test.txt']);
      mockConsoleLog.mockClear();
      
      // Keep changes
      await cli.run(['node', 'oops', 'keep', 'test.txt']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Changes applied successfully')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle undo command', async () => {
      // First track the file
      await cli.run(['node', 'oops', 'test.txt']);
      mockConsoleLog.mockClear();
      
      // Modify file
      const fs = await import('fs/promises');
      await fs.writeFile(testFile, 'Modified content');
      
      // Undo changes
      await cli.run(['node', 'oops', 'undo', 'test.txt']);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('File reverted to backup successfully')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle file not found error', async () => {
      await cli.run(['node', 'oops', 'nonexistent.txt']);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.stringContaining('nonexistent.txt')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should handle invalid command', async () => {
      await cli.run(['node', 'oops', 'invalid-command']);
      
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    test('should provide helpful error messages', async () => {
      await cli.run(['node', 'oops', 'diff']);
      
      expect(mockConsoleError).toHaveBeenCalled();
      // Should show hint about usage
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Hint:'),
        expect.anything()
      );
    });
  });

  describe('Environment Variable Handling', () => {
    test('should handle NO_COLOR environment variable', async () => {
      process.env.NO_COLOR = '1';
      
      await cli.run(['node', 'oops', 'test.txt']);
      
      // Colors should be disabled - hard to test directly, but shouldn't crash
      expect(mockProcessExit).not.toHaveBeenCalled();
      
      delete process.env.NO_COLOR;
    });
  });

  describe('Command Validation', () => {
    test('should validate file patterns correctly', async () => {
      // Test that files starting with dash are not treated as files
      await cli.run(['node', 'oops', '--verbose']);
      
      // Should not try to track --verbose as a file
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });

    test('should distinguish between commands and files', async () => {
      // Create a file named 'status'
      const statusFile = path.join(tempDir, 'status');
      const fs = await import('fs/promises');
      await fs.writeFile(statusFile, 'status file content');
      
      // This should track the file, not run status command
      await cli.run(['node', 'oops', 'status']);
      
      // Should run status command, not track file
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Workspace:')
      );
    });
  });

  describe('Global Options', () => {
    test('should handle workspace option', async () => {
      const customWorkspace = path.join(tempDir, 'custom-workspace');
      
      await cli.run(['node', 'oops', '--workspace', customWorkspace, 'test.txt']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Backup created')
      );
    });

    test('should handle verbose option', async () => {
      await cli.run(['node', 'oops', '--verbose', 'status']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle quiet option', async () => {
      await cli.run(['node', 'oops', '--quiet', 'status']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    test('should handle yes option', async () => {
      await cli.run(['node', 'oops', '--yes', 'status']);
      
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });
});