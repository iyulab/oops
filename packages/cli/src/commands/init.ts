/**
 * Init command implementation
 */

import { BaseCommand } from './base';
import { Oops } from '@iyulab/oops';

export class InitCommand extends BaseCommand {
  public async validate(args: any[]): Promise<void> {
    // Commander.js passes command options and the command object itself
    // We only need to validate if there are actual file arguments
    const fileArgs = args.filter(arg => typeof arg === 'string');
    if (fileArgs.length > 0) {
      throw new Error('init command does not accept additional arguments');
    }
  }

  public async execute(args: any[]): Promise<void> {
    try {
      this.log('Initializing workspace...');

      const oops = new Oops();

      // Check if workspace already exists
      const workspaceInfo = await oops.getWorkspaceInfo();
      if (workspaceInfo.exists) {
        this.log('⚠ Workspace already initialized at: ' + workspaceInfo.path);
        return;
      }

      // Initialize workspace
      this.log('Creating workspace at: ' + workspaceInfo.path);
      await oops.initWorkspace();

      const newWorkspaceInfo = await oops.getWorkspaceInfo();
      this.log('✓ Workspace initialized at: ' + newWorkspaceInfo.path);

    } catch (error: any) {
      this.error('Failed to initialize workspace: ' + error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
