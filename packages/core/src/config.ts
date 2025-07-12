/**
 * Configuration management for Oops
 */

import { OopsConfig } from './types';

export const DEFAULT_CONFIG: OopsConfig = {
  workspace: {
    useTemp: false,
    path: null,
  },
  safety: {
    confirmKeep: true,
    confirmUndo: true,
    autoBackup: true,
  },
  diff: {
    tool: 'auto',
    context: 3,
  },
};

export class ConfigManager {
  private config: OopsConfig;

  constructor(config: Partial<OopsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public get(): OopsConfig {
    return { ...this.config };
  }

  public set(key: string, value: any): void {
    const keys = key.split('.');
    let current: any = this.config;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Set the final value
    current[keys[keys.length - 1]] = value;
  }

  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}
