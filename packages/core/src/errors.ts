/**
 * Error classes for Oops
 */

export class OopsError extends Error {
  public readonly code: string;
  public readonly details: Record<string, any>;

  constructor(message: string, code: string, details: Record<string, any> = {}) {
    super(message);
    this.name = 'OopsError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileNotFoundError extends OopsError {
  constructor(filePath: string, details: Record<string, any> = {}) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath, ...details });
    this.name = 'FileNotFoundError';
  }
}

export class FileAlreadyTrackedError extends OopsError {
  constructor(filePath: string, details: Record<string, any> = {}) {
    super(`File is already being tracked: ${filePath}`, 'FILE_ALREADY_TRACKED', {
      filePath,
      ...details,
    });
    this.name = 'FileAlreadyTrackedError';
  }
}

export class FileNotTrackedError extends OopsError {
  constructor(filePath: string, details: Record<string, any> = {}) {
    super(`File is not being tracked: ${filePath}`, 'FILE_NOT_TRACKED', { filePath, ...details });
    this.name = 'FileNotTrackedError';
  }
}

export class WorkspaceNotFoundError extends OopsError {
  constructor(workspacePath: string, details: Record<string, any> = {}) {
    super(`Workspace not found: ${workspacePath}`, 'WORKSPACE_NOT_FOUND', {
      workspacePath,
      ...details,
    });
    this.name = 'WorkspaceNotFoundError';
  }
}

export class WorkspaceCorruptedError extends OopsError {
  constructor(workspacePath: string, details: Record<string, any> = {}) {
    super(`Workspace is corrupted: ${workspacePath}`, 'WORKSPACE_CORRUPTED', {
      workspacePath,
      ...details,
    });
    this.name = 'WorkspaceCorruptedError';
  }
}

export class GitOperationError extends OopsError {
  constructor(operation: string, details: Record<string, any> = {}) {
    super(`Git operation failed: ${operation}`, 'GIT_OPERATION_ERROR', { operation, ...details });
    this.name = 'GitOperationError';
  }
}

export class ValidationError extends OopsError {
  constructor(message: string, details: Record<string, any> = {}) {
    super(`Validation failed: ${message}`, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends OopsError {
  constructor(path: string, operation: string, details: Record<string, any> = {}) {
    super(`Permission denied: ${operation} on ${path}`, 'PERMISSION_ERROR', {
      path,
      operation,
      ...details,
    });
    this.name = 'PermissionError';
  }
}
