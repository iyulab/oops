/**
 * Keep command - Alias for untrack (stop tracking, keep current state)
 */

import { BaseCommand } from './base';
import { UntrackCommand } from './untrack';

export class KeepCommand extends BaseCommand {
  private untrackCommand = new UntrackCommand();

  async validate(args: string[]): Promise<void> {
    return this.untrackCommand.validate(args);
  }

  async execute(args: string[]): Promise<void> {
    const filePath = args[0];

    try {
      this.log(`Keeping current state and stopping tracking: ${filePath}`);

      // Use the same logic as untrack (preserve current state)
      await this.untrackCommand.execute(args);
    } catch (error: any) {
      this.error('Failed to keep file: ' + error.message);
      throw error;
    }
  }
}
