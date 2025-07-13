/**
 * Version System Tests - TDD for Simple Sequential Versioning
 * Tests the simple version numbering system (1 → 2 → 3 → 4...)
 */

import { Oops } from '../oops';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Version System', () => {
  let tempDir: string;
  let testFile: string;
  let oops: Oops;

  beforeEach(async () => {
    // Create temporary directory and test file
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oops-version-test-'));
    testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'initial content\n');

    // Create Oops instance with temporary workspace
    oops = new Oops({}, tempDir);
    await oops.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Version Creation', () => {
    test('should create version 1 when tracking new file', async () => {
      const result = await oops.trackWithVersion(testFile);

      expect(result.version).toBe(1);
      expect(result.message).toContain('Initial version');
    });

    test('should create version 2 on first commit', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'modified content\n');

      const result = await oops.commitVersion(testFile, 'First update');

      expect(result.version).toBe(2);
      expect(result.message).toBe('First update');
    });

    test('should create sequential versions 1 → 2 → 3', async () => {
      await oops.trackWithVersion(testFile);

      // First commit
      await fs.writeFile(testFile, 'version 2\n');
      const v2 = await oops.commitVersion(testFile, 'Version 2');
      expect(v2.version).toBe(2);

      // Second commit
      await fs.writeFile(testFile, 'version 3\n');
      const v3 = await oops.commitVersion(testFile, 'Version 3');
      expect(v3.version).toBe(3);
    });
  });

  describe('Version History', () => {
    test('should track complete version history', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'v2\n');
      await oops.commitVersion(testFile, 'Update 1');
      await fs.writeFile(testFile, 'v3\n');
      await oops.commitVersion(testFile, 'Update 2');

      const history = await oops.getVersionHistory(testFile);

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(3);
      expect(history[1].message).toBe('Update 1');
    });

    test('should include timestamps in version history', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'v2\n');
      await oops.commitVersion(testFile, 'Update');

      const history = await oops.getVersionHistory(testFile);

      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[1].timestamp).toBeInstanceOf(Date);
      expect(history[1].timestamp.getTime()).toBeGreaterThan(history[0].timestamp.getTime());
    });
  });

  describe('Version Navigation', () => {
    test('should checkout specific version', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'version 2\n');
      await oops.commitVersion(testFile, 'V2');
      await fs.writeFile(testFile, 'version 3\n');
      await oops.commitVersion(testFile, 'V3');

      // Go back to version 2
      await oops.checkoutVersion(testFile, 2);
      const content = await fs.readFile(testFile, 'utf-8');

      expect(content).toBe('version 2\n');
    });

    test('should track current version position', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'v2\n');
      await oops.commitVersion(testFile, 'V2');

      let currentVersion = await oops.getCurrentVersion(testFile);
      expect(currentVersion).toBe(2);

      await oops.checkoutVersion(testFile, 1);
      currentVersion = await oops.getCurrentVersion(testFile);
      expect(currentVersion).toBe(1);
    });
  });

  describe('Continuous Versioning', () => {
    test('should continue sequential numbering after checkout', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'v2\n');
      await oops.commitVersion(testFile, 'V2');
      await fs.writeFile(testFile, 'v3\n');
      await oops.commitVersion(testFile, 'V3');

      // Go back to version 2 and make changes
      await oops.checkoutVersion(testFile, 2);
      await fs.writeFile(testFile, 'alternative v4\n');
      const result = await oops.commitVersion(testFile, 'Alternative');

      // Should create version 4, not a branch
      expect(result.version).toBe(4);
    });

    test('should continue numbering from highest version', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'v2\n');
      await oops.commitVersion(testFile, 'V2');

      // Go back to version 1
      await oops.checkoutVersion(testFile, 1);
      await fs.writeFile(testFile, 'from v1\n');
      const result = await oops.commitVersion(testFile, 'From V1');

      // Should create version 3 (highest + 1)
      expect(result.version).toBe(3);
    });
  });

  describe('Version Comparison', () => {
    test('should show diff between versions', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'version 2\n');
      await oops.commitVersion(testFile, 'V2');
      await fs.writeFile(testFile, 'version 3\n');
      await oops.commitVersion(testFile, 'V3');

      const diff = await oops.getVersionDiff(testFile, 1, 3);

      expect(diff).toContain('-initial content');
      expect(diff).toContain('+version 3');
    });

    test('should show diff against working directory', async () => {
      await oops.trackWithVersion(testFile);
      await fs.writeFile(testFile, 'modified content\n');

      const diff = await oops.getVersionDiff(testFile);

      expect(diff).toContain('-initial content');
      expect(diff).toContain('+modified content');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for non-existent version', async () => {
      await oops.trackWithVersion(testFile);

      await expect(oops.checkoutVersion(testFile, 999)).rejects.toThrow('Version 999 not found');
    });

    test('should throw error when committing without changes', async () => {
      await oops.trackWithVersion(testFile);

      await expect(oops.commitVersion(testFile, 'No changes')).rejects.toThrow(
        'No changes detected'
      );
    });

    test('should handle untracked files gracefully', async () => {
      await expect(oops.getCurrentVersion(testFile)).rejects.toThrow('not being tracked');
      await expect(oops.getVersionHistory(testFile)).rejects.toThrow('not being tracked');
    });
  });
});
