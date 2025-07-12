/**
 * Base command class
 */

export abstract class BaseCommand {
  protected verbose = false;
  protected quiet = false;

  constructor(options: { verbose?: boolean; quiet?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
  }

  abstract validate(_args: any[]): Promise<void>;
  abstract execute(_args: any[]): Promise<void>;
  async cleanup?(_error?: Error): Promise<void> {
    // Default implementation - can be overridden
  }

  protected log(message: string) {
    if (!this.quiet) {
      console.log(message);
    }
  }

  protected debug(message: string) {
    if (this.verbose) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  protected error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}
