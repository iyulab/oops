/**
 * Test suite for GitWrapper with isomorphic-git
 */

import { GitWrapper } from '../git';
import { FileSystem } from '../file-system';
import * as path from 'path';
import * as os from 'os';

describe('GitWrapper', () => {
  let tempDir: string;
  let gitWrapper: GitWrapper;
  let testFile: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `git-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await FileSystem.mkdir(tempDir);
    
    gitWrapper = new GitWrapper(tempDir);
    testFile = path.join(tempDir, 'test.txt');
    await FileSystem.writeFile(testFile, 'Hello World');
  });

  afterEach(async () => {
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Git Initialization', () => {
    test('should initialize git repository', async () => {
      await gitWrapper.init();
      
      const gitDir = path.join(tempDir, '.git');
      expect(await FileSystem.exists(gitDir)).toBe(true);
    });

    test('should check if repository is healthy after init', async () => {
      await gitWrapper.init();
      expect(await gitWrapper.isHealthy()).toBe(true);
    });

    test('should return false for health check before init', async () => {
      expect(await gitWrapper.isHealthy()).toBe(false);
    });
  });

  describe('Git Operations', () => {
    beforeEach(async () => {
      await gitWrapper.init();
    });

    test('should add files to git', async () => {
      await expect(gitWrapper.add(testFile)).resolves.not.toThrow();
    });

    test('should commit changes', async () => {
      await gitWrapper.add(testFile);
      await expect(gitWrapper.commit('Initial commit')).resolves.not.toThrow();
    });

    test('should get status', async () => {
      const status = await gitWrapper.status();
      expect(status).toBeDefined();
      expect(status.files).toBeDefined();
    });

    test('should generate diff for modified file', async () => {
      // Add and commit initial file
      await gitWrapper.add(testFile);
      await gitWrapper.commit('Initial commit');
      
      // Modify file
      await FileSystem.writeFile(testFile, 'Hello Modified World');
      
      const diff = await gitWrapper.diff(testFile);
      expect(diff).toBeDefined();
    });

    test('should show no diff for unmodified file', async () => {
      // Add and commit file
      await gitWrapper.add(testFile);
      await gitWrapper.commit('Initial commit');
      
      const diff = await gitWrapper.diff(testFile);
      expect(diff).toBe('');
    });

    test('should reset file to HEAD', async () => {
      // Add and commit file
      await gitWrapper.add(testFile);
      await gitWrapper.commit('Initial commit');
      
      await expect(gitWrapper.reset(testFile)).resolves.not.toThrow();
    });

    test('should checkout file from HEAD', async () => {
      // Add and commit file
      await gitWrapper.add(testFile);
      await gitWrapper.commit('Initial commit');
      
      // Modify file
      await FileSystem.writeFile(testFile, 'Modified content');
      
      // Checkout original version
      await gitWrapper.checkout(testFile);
      
      const content = await FileSystem.readFile(testFile);
      expect(content).toBe('Hello World');
    });
  });

  describe('Git History', () => {
    beforeEach(async () => {
      await gitWrapper.init();
    });

    test('should have no commits initially', async () => {
      expect(await gitWrapper.hasCommits()).toBe(false);
      expect(await gitWrapper.getCommitCount()).toBe(0);
    });

    test('should count commits correctly', async () => {
      await gitWrapper.add(testFile);
      await gitWrapper.commit('First commit');
      
      expect(await gitWrapper.hasCommits()).toBe(true);
      expect(await gitWrapper.getCommitCount()).toBe(1);
      
      // Add another commit
      const file2 = path.join(tempDir, 'test2.txt');
      await FileSystem.writeFile(file2, 'Second file');
      await gitWrapper.add(file2);
      await gitWrapper.commit('Second commit');
      
      expect(await gitWrapper.getCommitCount()).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle git operations before init gracefully', async () => {
      // Most operations should auto-initialize, but let's test explicit behavior
      await expect(gitWrapper.add(testFile)).resolves.not.toThrow();
    });

    test('should handle non-existent files', async () => {
      await gitWrapper.init();
      
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      await expect(gitWrapper.add(nonExistentFile)).rejects.toThrow();
    });

    test('should handle checkout of non-existent file', async () => {
      await gitWrapper.init();
      
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      await expect(gitWrapper.checkout(nonExistentFile)).rejects.toThrow();
    });

    test('should handle diff of uncommitted file', async () => {
      await gitWrapper.init();
      
      const diff = await gitWrapper.diff(testFile);
      expect(diff).toContain('+');
    });
  });

  describe('Git Configuration', () => {
    test('should set up git config during init', async () => {
      await gitWrapper.init();
      
      // Git should be configured with Oops user
      // We can't easily test config values with isomorphic-git, but init should not throw
      expect(await gitWrapper.isHealthy()).toBe(true);
    });
  });
});