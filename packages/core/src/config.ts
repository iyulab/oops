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

  public set(_key: string, _value: any): void {
    // TODO: Implement nested key setting
    // For now, just placeholder
  }

  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}
