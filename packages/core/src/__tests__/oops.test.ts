/**
 * Comprehensive test suite for Oops core SDK
 */

import { Oops } from '../oops';
import { FileSystem } from '../file-system';
import * as path from 'path';
import * as os from 'os';

describe('Oops Core SDK', () => {
  let tempDir: string;
  let oops: Oops;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(
      os.tmpdir(),
      `oops-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
    await FileSystem.mkdir(tempDir);

    // Create Oops instance with temp workspace
    const workspacePath = path.join(tempDir, '.oops');
    oops = new Oops({}, workspacePath);

    // Create test file
    testFile = path.join(tempDir, 'test.txt');
    await FileSystem.writeFile(testFile, 'Hello World');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Workspace Management', () => {
    test('should initialize workspace', async () => {
      await oops.init();
      const workspaceInfo = await oops.getWorkspaceInfo();

      expect(workspaceInfo.exists).toBe(true);
      expect(workspaceInfo.isHealthy).toBe(true);
      expect(workspaceInfo.trackedFiles).toEqual([]);
    });

    test('should get workspace info when not initialized', async () => {
      const workspaceInfo = await oops.getWorkspaceInfo();

      expect(workspaceInfo.exists).toBe(false);
      expect(workspaceInfo.isHealthy).toBe(false);
    });

    test('should check workspace health', async () => {
      expect(await oops.isWorkspaceHealthy()).toBe(false);

      await oops.init();
      expect(await oops.isWorkspaceHealthy()).toBe(true);
    });

    test('should clean workspace', async () => {
      await oops.init();
      await oops.track(testFile);

      await oops.cleanWorkspace();

      const workspaceInfo = await oops.getWorkspaceInfo();
      expect(workspaceInfo.exists).toBe(true);
      expect(workspaceInfo.trackedFiles).toHaveLength(0);
    });

    test('should get workspace size', async () => {
      await oops.init();
      await oops.track(testFile);

      const size = await oops.getWorkspaceSize();
      expect(size.files).toBe(1);
      expect(size.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('File Tracking', () => {
    beforeEach(async () => {
      await oops.init();
    });

    test('should start tracking a file', async () => {
      const trackingInfo = await oops.track(testFile);

      expect(trackingInfo.filePath).toBe(testFile);
      expect(trackingInfo.isTracked).toBe(true);
      expect(await FileSystem.exists(trackingInfo.backupPath)).toBe(true);
    });

    test('should check if file is tracked', async () => {
      expect(await oops.isTracked(testFile)).toBe(false);

      await oops.track(testFile);
      expect(await oops.isTracked(testFile)).toBe(true);
    });

    test('should get tracking info', async () => {
      await oops.track(testFile);
      const trackingInfo = await oops.getTrackingInfo(testFile);

      expect(trackingInfo.filePath).toBe(testFile);
      expect(trackingInfo.isTracked).toBe(true);
    });

    test('should get all tracked files', async () => {
      const file2 = path.join(tempDir, 'test2.txt');
      await FileSystem.writeFile(file2, 'Hello World 2');

      await oops.track(testFile);
      await oops.track(file2);

      const trackedFiles = await oops.getAllTrackedFiles();
      expect(trackedFiles).toHaveLength(2);
      expect(trackedFiles.map(f => f.filePath)).toContain(testFile);
      expect(trackedFiles.map(f => f.filePath)).toContain(file2);
    });

    test('should throw error when tracking non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');

      await expect(oops.track(nonExistentFile)).rejects.toThrow();
    });

    test('should throw error when tracking already tracked file', async () => {
      await oops.track(testFile);

      await expect(oops.track(testFile)).rejects.toThrow();
    });
  });

  describe('File Changes and Diff', () => {
    beforeEach(async () => {
      await oops.init();
      await oops.track(testFile);
    });

    test('should detect changes', async () => {
      // Modify file
      await FileSystem.writeFile(testFile, 'Hello Modified World');

      expect(await oops.hasChanges(testFile)).toBe(true);
    });

    test('should detect no changes', async () => {
      expect(await oops.hasChanges(testFile)).toBe(false);
    });

    test('should generate diff', async () => {
      // Modify file
      await FileSystem.writeFile(testFile, 'Hello Modified World');

      const diffResult = await oops.diff(testFile);
      expect(diffResult.hasChanges).toBe(true);
      expect(diffResult.addedLines).toBeGreaterThan(0);
    });

    test('should handle diff for untracked file', async () => {
      const untrackedFile = path.join(tempDir, 'untracked.txt');
      await FileSystem.writeFile(untrackedFile, 'Untracked content');

      await expect(oops.diff(untrackedFile)).rejects.toThrow();
    });
  });

  describe('Keep and Undo Operations', () => {
    beforeEach(async () => {
      await oops.init();
      await oops.track(testFile);
    });

    test('should keep changes', async () => {
      // Modify file
      const newContent = 'Hello Modified World';
      await FileSystem.writeFile(testFile, newContent);

      await oops.keep(testFile);

      // File should no longer be tracked
      expect(await oops.isTracked(testFile)).toBe(false);

      // File should contain new content
      const content = await FileSystem.readFile(testFile);
      expect(content).toBe(newContent);
    });

    test('should undo changes', async () => {
      const originalContent = await FileSystem.readFile(testFile);

      // Modify file
      await FileSystem.writeFile(testFile, 'Hello Modified World');

      await oops.undo(testFile);

      // File should no longer be tracked
      expect(await oops.isTracked(testFile)).toBe(false);

      // File should contain original content
      const content = await FileSystem.readFile(testFile);
      expect(content).toBe(originalContent);
    });

    test('should abort tracking', async () => {
      // Modify file
      await FileSystem.writeFile(testFile, 'Hello Modified World');

      await oops.abort(testFile);

      // File should no longer be tracked
      expect(await oops.isTracked(testFile)).toBe(false);

      // File should still contain modified content
      const content = await FileSystem.readFile(testFile);
      expect(content).toBe('Hello Modified World');
    });

    test('should throw error when keeping untracked file', async () => {
      await oops.keep(testFile); // Stop tracking

      await expect(oops.keep(testFile)).rejects.toThrow();
    });

    test('should throw error when undoing untracked file', async () => {
      await oops.keep(testFile); // Stop tracking

      await expect(oops.undo(testFile)).rejects.toThrow();
    });
  });

  describe('Batch Operations', () => {
    let file2: string;
    let file3: string;

    beforeEach(async () => {
      await oops.init();

      file2 = path.join(tempDir, 'test2.txt');
      file3 = path.join(tempDir, 'test3.txt');

      await FileSystem.writeFile(file2, 'Hello World 2');
      await FileSystem.writeFile(file3, 'Hello World 3');

      await oops.track(testFile);
      await oops.track(file2);
      await oops.track(file3);
    });

    test('should keep all files', async () => {
      // Modify all files
      await FileSystem.writeFile(testFile, 'Modified 1');
      await FileSystem.writeFile(file2, 'Modified 2');
      await FileSystem.writeFile(file3, 'Modified 3');

      await oops.keepAll();

      // No files should be tracked
      const trackedFiles = await oops.getAllTrackedFiles();
      expect(trackedFiles).toHaveLength(0);
    });

    test('should undo all files', async () => {
      // Modify all files
      await FileSystem.writeFile(testFile, 'Modified 1');
      await FileSystem.writeFile(file2, 'Modified 2');
      await FileSystem.writeFile(file3, 'Modified 3');

      await oops.undoAll();

      // No files should be tracked
      const trackedFiles = await oops.getAllTrackedFiles();
      expect(trackedFiles).toHaveLength(0);

      // Files should contain original content
      expect(await FileSystem.readFile(testFile)).toBe('Hello World');
      expect(await FileSystem.readFile(file2)).toBe('Hello World 2');
      expect(await FileSystem.readFile(file3)).toBe('Hello World 3');
    });

    test('should abort all files', async () => {
      await oops.abortAll();

      // No files should be tracked
      const trackedFiles = await oops.getAllTrackedFiles();
      expect(trackedFiles).toHaveLength(0);
    });
  });

  describe('File Validation', () => {
    beforeEach(async () => {
      await oops.init();
    });

    test('should validate tracked files', async () => {
      await oops.track(testFile);

      const validation = await oops.validateTrackedFiles();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid tracked files', async () => {
      await oops.track(testFile);

      // Delete the file
      const fs = await import('fs/promises');
      await fs.unlink(testFile);

      const validation = await oops.validateTrackedFiles();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain(testFile);
    });
  });

  describe('Configuration', () => {
    test('should get configuration', () => {
      const config = oops.getConfig();
      expect(config).toBeDefined();
      expect(config.workspace).toBeDefined();
      expect(config.safety).toBeDefined();
    });

    test('should set configuration', () => {
      oops.setConfig('safety.confirmKeep', false);
      const config = oops.getConfig();
      expect(config.safety.confirmKeep).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('should get version', async () => {
      const version = await oops.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Static Factory Methods', () => {
    test('should create temporary workspace', async () => {
      const tempOops = await Oops.createTempWorkspace();
      expect(tempOops).toBeInstanceOf(Oops);

      const workspaceInfo = await tempOops.getWorkspaceInfo();
      expect(workspaceInfo.path).toContain('oops-');
    });

    test('should create local workspace', async () => {
      const localOops = await Oops.createLocalWorkspace(tempDir);
      expect(localOops).toBeInstanceOf(Oops);

      const workspaceInfo = await localOops.getWorkspaceInfo();
      expect(workspaceInfo.path).toBe(tempDir);
    });
  });
});
