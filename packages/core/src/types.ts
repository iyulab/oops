/**
 * Core type definitions for Oops
 */

export interface OopsConfig {
  workspace: {
    useTemp: boolean;
    path: string | null;
  };
  safety: {
    confirmKeep: boolean;
    confirmUndo: boolean;
    autoBackup: boolean;
  };
  diff: {
    tool: string;
    context: number;
  };
}

export interface FileTrackingInfo {
  filePath: string;
  backupPath: string;
  workspacePath: string;
  isTracked: boolean;
  hasChanges: boolean;
  createdAt: Date;
  modifiedAt: Date;
  metadata: Record<string, any>;
}

export interface DiffResult {
  hasChanges: boolean;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  diff: string;
}

export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: Date;
  checksum: string;
  metadata: Record<string, any>;
}

export interface WorkspaceInfo {
  path: string;
  type: 'local' | 'temp' | 'explicit';
  exists: boolean;
  isHealthy: boolean;
  trackedFiles: FileTrackingInfo[];
  createdAt: Date;
}

export type FileStatus = 'clean' | 'modified' | 'new' | 'deleted';

export interface FileStatusInfo {
  path: string;
  status: FileStatus;
  isTracked: boolean;
  hasBackup: boolean;
  lastModified: Date;
}
