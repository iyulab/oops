# @iyulab/oops

Core SDK for Oops - Safe text file editing with automatic backup and simple undo.

## Installation

```bash
npm install @iyulab/oops
```

## Quick Start

```typescript
import { Oops } from '@iyulab/oops';

const oops = new Oops();

// Initialize workspace
await oops.initWorkspace();

// Start tracking a file
await oops.begin('/path/to/file.txt');

// Check for changes
const hasChanges = await oops.hasChanges('/path/to/file.txt');

// Get diff
const diff = await oops.diff('/path/to/file.txt');

// Apply changes
await oops.keep('/path/to/file.txt');

// Or undo changes
await oops.undo('/path/to/file.txt');
```

## Features

- 🔒 **Safe file editing** with automatic backup
- 📝 **Simple undo** functionality
- 🗂️ **Workspace management** with temporary or local storage
- 🔄 **Batch operations** for multiple files
- 📊 **File validation** and health checks
- ⚙️ **Configurable** safety options

## API Reference

### Core Methods

#### `initWorkspace()`
Initialize a new workspace for tracking files.

#### `begin(filePath: string)`
Start tracking a file by creating a backup.

#### `hasChanges(filePath: string): Promise<boolean>`
Check if a tracked file has changes.

#### `diff(filePath: string): Promise<DiffResult>`
Generate diff information for a tracked file.

#### `keep(filePath: string)`
Apply changes and stop tracking the file.

#### `undo(filePath: string)`
Revert file to backup and stop tracking.

#### `abort(filePath: string)`
Stop tracking without reverting changes.

### Batch Operations

#### `keepAll()`
Apply changes to all tracked files.

#### `undoAll()`
Revert all tracked files to their backups.

#### `abortAll()`
Stop tracking all files without reverting.

### Workspace Management

#### `getWorkspaceInfo(): Promise<WorkspaceInfo>`
Get information about the current workspace.

#### `isWorkspaceHealthy(): Promise<boolean>`
Check if the workspace is in a healthy state.

#### `cleanWorkspace()`
Clean up the workspace and all tracking data.

#### `getWorkspaceSize(): Promise<{files: number, sizeBytes: number}>`
Get workspace size information.

### Configuration

#### `getConfig(): OopsConfig`
Get current configuration.

#### `setConfig(key: string, value: any)`
Set configuration values (supports nested keys like 'safety.confirmKeep').

## Configuration Options

```typescript
interface OopsConfig {
  workspace: {
    useTemp: boolean;    // Use temporary directory
    path: string | null; // Custom workspace path
  };
  safety: {
    confirmKeep: boolean;   // Confirm before applying changes
    confirmUndo: boolean;   // Confirm before undoing
    autoBackup: boolean;    // Automatic backup creation
  };
  diff: {
    tool: string;    // External diff tool ('auto', 'code', 'vimdiff', etc.)
    context: number; // Number of context lines in diff
  };
}
```

## Static Factory Methods

#### `Oops.createTempWorkspace(): Promise<Oops>`
Create an instance with a temporary workspace.

#### `Oops.createLocalWorkspace(basePath: string): Promise<Oops>`
Create an instance with a local workspace.

## Error Handling

The SDK provides specific error types for better error handling:

- `FileNotFoundError`
- `FileAlreadyTrackedError` 
- `FileNotTrackedError`
- `WorkspaceNotInitializedError`
- `WorkspaceCorruptedError`
- `GitOperationError`

## TypeScript Support

This package is written in TypeScript and includes complete type definitions.

## License

MIT - see [LICENSE](./LICENSE) for details.

## Repository

[https://github.com/iyulab/oops](https://github.com/iyulab/oops)