/**
 * Output formatting utilities
 */

// Simple color helpers
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

export class OutputFormatter {
  public static success(message: string): void {
    console.log(colors.green('✓'), message);
  }

  public static error(message: string): void {
    console.log(colors.red('✗'), message);
  }

  public static warning(message: string): void {
    console.log(colors.yellow('⚠'), message);
  }

  public static info(message: string): void {
    console.log(colors.blue('ℹ'), message);
  }

  public static debug(message: string): void {
    console.log(colors.gray('🐛'), message);
  }
}
