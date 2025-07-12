/**
 * User prompt utilities
 */

import * as readline from 'readline';

export class PromptManager {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  public async confirm(message: string, defaultValue = false): Promise<boolean> {
    const suffix = defaultValue ? ' (Y/n)' : ' (y/N)';
    return new Promise(resolve => {
      this.rl.question(message + suffix + ' ', answer => {
        const normalizedAnswer = answer.toLowerCase().trim();
        if (normalizedAnswer === '') {
          resolve(defaultValue);
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
        }
      });
    });
  }

  public async input(message: string, defaultValue?: string): Promise<string> {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    return new Promise(resolve => {
      this.rl.question(message + suffix + ': ', answer => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }

  public close(): void {
    this.rl.close();
  }
}
