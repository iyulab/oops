/**
 * Basic test for Oops core functionality
 */

import { Oops } from '../oops';
import * as os from 'os';
import * as path from 'path';

describe('Oops', () => {
  it('should create a new instance with temp workspace', () => {
    const tempDir = path.join(os.tmpdir(), 'oops-test');
    const oops = new Oops({}, tempDir);
    expect(oops).toBeInstanceOf(Oops);
  });

  it('should get default configuration', () => {
    const tempDir = path.join(os.tmpdir(), 'oops-test');
    const oops = new Oops({}, tempDir);
    const config = oops.getConfig();
    expect(config).toBeDefined();
    expect(config.workspace).toBeDefined();
    expect(config.safety).toBeDefined();
    expect(config.diff).toBeDefined();
  });
});
