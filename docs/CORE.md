# Oops Core SDK Documentation

The Oops Core SDK (`@iyulab/oops`) provides programmatic access to safe file editing capabilities. This is the same engine that powers the CLI, but available as a JavaScript/TypeScript library.

## Installation

```bash
npm install @iyulab/oops
```

## Quick Start

```javascript
const { Oops } = require('@iyulab/oops');

async function safeEdit() {
  const oops = new Oops();
  
  // Start tracking a file
  await oops.track('/path/to/config.txt');
  
  // Your application modifies the file...
  require('fs').writeFileSync('/path/to/config.txt', 'new content');
  
  // Review changes
  const diff = await oops.diff('/path/to/config.txt');
  console.log('Changes:', diff);
  
  // Apply or revert
  if (changesLookGood) {
    await oops.keep('/path/to/config.txt');
  } else {
    await oops.undo('/path/to/config.txt');
  }
}
```

## API Reference

### Constructor

#### `new Oops(options?)`

Create a new Oops instance with optional configuration.

```javascript
const oops = new Oops({
  workspacePath: './.oops',    // Custom workspace path
  tempWorkspace: false,        // Use persistent workspace
  verbose: false               // Enable verbose logging
});
```

**Options:**
- `workspacePath?: string` - Custom workspace directory path
- `tempWorkspace?: boolean` - Use temporary workspace (default: true)
- `verbose?: boolean` - Enable verbose logging (default: false)

### Core Methods

#### `track(filePath: string): Promise<void>`

Start tracking a file for safe editing. Creates a backup and initializes tracking.

```javascript
await oops.track('/path/to/config.txt');
```

**Parameters:**
- `filePath: string` - Absolute path to the file to track

**Throws:**
- `OopsError` - If file doesn't exist or is already being tracked
- `FileSystemError` - If file cannot be read
- `WorkspaceError` - If workspace initialization fails

#### `diff(filePath: string): Promise<DiffResult>`

Get differences between the current file and its backup.

```javascript
const result = await oops.diff('/path/to/config.txt');
console.log(`${result.addedLines} lines added`);
console.log(`${result.removedLines} lines removed`);
console.log(`${result.modifiedLines} lines modified`);
```

**Returns: `DiffResult`**
```typescript
interface DiffResult {
  hasChanges: boolean;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  unified: string;        // Unified diff format
  summary: string;        // Human-readable summary
}
```

#### `keep(filePath: string): Promise<void>`

Apply changes and stop tracking the file. This removes the backup and tracking data.

```javascript
await oops.keep('/path/to/config.txt');
```

**Parameters:**
- `filePath: string` - Path to the tracked file

**Throws:**
- `OopsError` - If file is not being tracked

#### `undo(filePath: string): Promise<void>`

Revert file to backup and stop tracking. This discards all current changes.

```javascript
await oops.undo('/path/to/config.txt');
```

**Parameters:**
- `filePath: string` - Path to the tracked file

**Throws:**
- `OopsError` - If file is not being tracked

### Status and Information

#### `status(): Promise<WorkspaceStatus>`

Get comprehensive workspace status including all tracked files.

```javascript
const status = await oops.status();
console.log(`Workspace: ${status.path}`);
console.log(`Tracked files: ${status.trackedFiles.length}`);
```

**Returns: `WorkspaceStatus`**
```typescript
interface WorkspaceStatus {
  exists: boolean;
  isHealthy: boolean;
  path: string;
  trackedFiles: TrackedFile[];
  size: number;           // Workspace size in bytes
}

interface TrackedFile {
  filePath: string;
  hasChanges: boolean;
  backupPath: string;
  createdAt: Date;
  modifiedAt: Date;
}
```

#### `isTracked(filePath: string): Promise<boolean>`

Check if a file is currently being tracked.

```javascript
const tracked = await oops.isTracked('/path/to/config.txt');
if (tracked) {
  console.log('File is being tracked');
}
```

#### `hasChanges(filePath: string): Promise<boolean>`

Check if a tracked file has been modified since backup.

```javascript
const modified = await oops.hasChanges('/path/to/config.txt');
if (modified) {
  console.log('File has been modified');
}
```

#### `getTrackingInfo(filePath: string): Promise<TrackingInfo>`

Get detailed tracking information for a file.

```javascript
const info = await oops.getTrackingInfo('/path/to/config.txt');
console.log(`Backup location: ${info.backupPath}`);
console.log(`Started tracking: ${info.createdAt}`);
```

**Returns: `TrackingInfo`**
```typescript
interface TrackingInfo {
  filePath: string;
  backupPath: string;
  workspacePath: string;
  createdAt: Date;
  modifiedAt: Date;
  hasChanges: boolean;
}
```

### Workspace Management

#### `init(): Promise<void>`

Initialize a new workspace. Usually called automatically.

```javascript
await oops.init();
```

#### `getWorkspaceInfo(): Promise<WorkspaceInfo>`

Get workspace information without modifying anything.

```javascript
const info = await oops.getWorkspaceInfo();
console.log(`Workspace exists: ${info.exists}`);
console.log(`Location: ${info.path}`);
```

#### `cleanWorkspace(): Promise<void>`

Clean up workspace and all tracking data. **This removes all backups.**

```javascript
await oops.cleanWorkspace();
```

#### `checkWorkspaceHealth(): Promise<boolean>`

Verify workspace integrity and Git repositories.

```javascript
const healthy = await oops.checkWorkspaceHealth();
if (!healthy) {
  console.warn('Workspace corruption detected');
}
```

### Batch Operations

#### `keepAll(): Promise<void>`

Apply changes for all tracked files and stop tracking them.

```javascript
await oops.keepAll();
```

#### `undoAll(): Promise<void>`

Revert all tracked files to their backups and stop tracking.

```javascript
await oops.undoAll();
```

#### `getAllTrackedFiles(): Promise<string[]>`

Get list of all currently tracked file paths.

```javascript
const files = await oops.getAllTrackedFiles();
files.forEach(file => console.log(`Tracking: ${file}`));
```

### Configuration

#### `getConfig(): Promise<OopsConfig>`

Get current configuration.

```javascript
const config = await oops.getConfig();
console.log(`Workspace: ${config.workspacePath}`);
```

#### `setConfig(config: Partial<OopsConfig>): Promise<void>`

Update configuration.

```javascript
await oops.setConfig({
  workspacePath: '/custom/workspace',
  tempWorkspace: false
});
```

**Config Options:**
```typescript
interface OopsConfig {
  workspacePath: string;
  tempWorkspace: boolean;
  verbose: boolean;
  diffTool?: string;       // External diff tool (future)
  backupFormat?: string;   // Backup naming format (future)
}
```

### Utility Methods

#### `getVersion(): string`

Get the current Oops version.

```javascript
const version = oops.getVersion();
console.log(`Oops version: ${version}`);
```

#### `validateTrackedFiles(): Promise<string[]>`

Validate all tracked files and return list of any issues.

```javascript
const issues = await oops.validateTrackedFiles();
if (issues.length > 0) {
  console.warn('Issues found:', issues);
}
```

### Static Factory Methods

#### `Oops.createTempWorkspace(): Promise<Oops>`

Create an instance with a temporary workspace.

```javascript
const oops = await Oops.createTempWorkspace();
// Workspace will auto-clean on process exit
```

#### `Oops.createLocalWorkspace(path?: string): Promise<Oops>`

Create an instance with a persistent local workspace.

```javascript
const oops = await Oops.createLocalWorkspace('./.oops');
// Workspace persists across application restarts
```

## Error Handling

The Oops SDK uses a hierarchy of error classes for precise error handling:

```javascript
import { 
  OopsError, 
  FileSystemError, 
  WorkspaceError, 
  GitError,
  ValidationError 
} from '@iyulab/oops';

try {
  await oops.track('/nonexistent/file.txt');
} catch (error) {
  if (error instanceof FileSystemError) {
    console.error('File system issue:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof OopsError) {
    console.error('Oops error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Types

- **`OopsError`** - Base error class for all Oops-related errors
- **`FileSystemError`** - File system operation failures
- **`WorkspaceError`** - Workspace initialization or corruption issues
- **`GitError`** - Git operation failures
- **`ValidationError`** - Input validation failures

## Integration Patterns

### Web Applications

```javascript
const express = require('express');
const { Oops } = require('@iyulab/oops');

app.post('/config/edit', async (req, res) => {
  const oops = new Oops();
  
  try {
    // Start tracking
    await oops.track(req.body.configPath);
    
    // Apply user changes
    require('fs').writeFileSync(req.body.configPath, req.body.content);
    
    // Validate changes
    const isValid = await validateConfig(req.body.configPath);
    
    if (isValid) {
      await oops.keep(req.body.configPath);
      res.json({ success: true });
    } else {
      await oops.undo(req.body.configPath);
      res.status(400).json({ error: 'Invalid configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Build Tools

```javascript
const { Oops } = require('@iyulab/oops');

async function safeConfigUpdate(configPath, updates) {
  const oops = new Oops();
  
  await oops.track(configPath);
  
  try {
    // Apply updates
    const config = JSON.parse(require('fs').readFileSync(configPath));
    Object.assign(config, updates);
    require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Validate
    await validateBuild();
    
    // Keep if validation passes
    await oops.keep(configPath);
    console.log('Configuration updated successfully');
    
  } catch (error) {
    // Revert on any error
    await oops.undo(configPath);
    throw new Error(`Config update failed: ${error.message}`);
  }
}
```

### Testing and Development

```javascript
const { Oops } = require('@iyulab/oops');

describe('Config modifications', () => {
  let oops;
  
  beforeEach(async () => {
    oops = await Oops.createTempWorkspace();
  });
  
  it('should safely modify config', async () => {
    await oops.track('/path/to/test-config.json');
    
    // Modify file in test
    require('fs').writeFileSync('/path/to/test-config.json', 'new content');
    
    const hasChanges = await oops.hasChanges('/path/to/test-config.json');
    expect(hasChanges).toBe(true);
    
    // Revert after test
    await oops.undo('/path/to/test-config.json');
  });
});
```

### Automated Scripts

```javascript
const { Oops } = require('@iyulab/oops');

async function updateServerConfigs(servers, configUpdates) {
  const oops = new Oops();
  const results = [];
  
  for (const server of servers) {
    const configPath = `/etc/${server}/config.conf`;
    
    try {
      await oops.track(configPath);
      
      // Apply updates
      await applyConfigUpdates(configPath, configUpdates);
      
      // Test configuration
      const testResult = await testServerConfig(server);
      
      if (testResult.success) {
        await oops.keep(configPath);
        results.push({ server, status: 'success' });
      } else {
        await oops.undo(configPath);
        results.push({ server, status: 'failed', error: testResult.error });
      }
    } catch (error) {
      results.push({ server, status: 'error', error: error.message });
    }
  }
  
  return results;
}
```

## Advanced Usage

### Custom Workspace Management

```javascript
const oops = new Oops({
  workspacePath: '/custom/workspace',
  tempWorkspace: false
});

// Pre-check workspace health
const healthy = await oops.checkWorkspaceHealth();
if (!healthy) {
  console.warn('Workspace issues detected, cleaning up...');
  await oops.cleanWorkspace();
  await oops.init();
}
```

### Batch Processing

```javascript
async function processMultipleFiles(filePaths) {
  const oops = new Oops();
  
  // Start tracking all files
  for (const filePath of filePaths) {
    await oops.track(filePath);
  }
  
  // Make changes to all files
  await performBulkEdits(filePaths);
  
  // Review and apply changes selectively
  for (const filePath of filePaths) {
    const hasChanges = await oops.hasChanges(filePath);
    const diff = await oops.diff(filePath);
    
    console.log(`File: ${filePath}`);
    console.log(`Changes: ${hasChanges ? 'Yes' : 'No'}`);
    
    if (hasChanges) {
      const shouldKeep = await askUser(`Keep changes to ${filePath}?`);
      if (shouldKeep) {
        await oops.keep(filePath);
      } else {
        await oops.undo(filePath);
      }
    }
  }
}
```

### Error Recovery

```javascript
async function robustFileEdit(filePath, editFunction) {
  const oops = new Oops();
  
  try {
    await oops.track(filePath);
    
    // Perform edit
    await editFunction(filePath);
    
    // Validate result
    await validateFile(filePath);
    
    // Apply if valid
    await oops.keep(filePath);
    
  } catch (error) {
    console.error('Edit failed:', error.message);
    
    // Check if we're tracking the file
    const isTracked = await oops.isTracked(filePath);
    if (isTracked) {
      console.log('Reverting to backup...');
      await oops.undo(filePath);
    }
    
    throw error;
  }
}
```

## Performance Considerations

### Memory Usage

- Each tracked file uses approximately 2x file size in disk space (original + backup)
- Git repositories are lightweight for single files
- Temporary workspaces clean up automatically

### Concurrency

```javascript
// Safe: Multiple instances with different workspaces
const oops1 = new Oops({ workspacePath: '/workspace1' });
const oops2 = new Oops({ workspacePath: '/workspace2' });

// Avoid: Multiple instances sharing workspace
// This may cause conflicts
```

### Large Files

```javascript
// For very large files, check size before tracking
const stats = require('fs').statSync(filePath);
if (stats.size > 100 * 1024 * 1024) { // 100MB
  console.warn('Large file detected, operations may be slower');
}

await oops.track(filePath);
```

## TypeScript Support

The Oops Core SDK is written in TypeScript and provides full type definitions:

```typescript
import { Oops, DiffResult, WorkspaceStatus, OopsError } from '@iyulab/oops';

async function typedExample(): Promise<void> {
  const oops: Oops = new Oops();
  
  await oops.track('/path/to/file.ts');
  
  const diff: DiffResult = await oops.diff('/path/to/file.ts');
  if (diff.hasChanges) {
    console.log(`Modified lines: ${diff.modifiedLines}`);
  }
  
  const status: WorkspaceStatus = await oops.status();
  status.trackedFiles.forEach(file => {
    console.log(`Tracking: ${file.filePath}`);
  });
}
```

## Migration Guide

### From CLI to SDK

If you're currently using the CLI and want to integrate programmatically:

```bash
# CLI
oops config.txt
vim config.txt
oops diff config.txt
oops keep config.txt
```

```javascript
// SDK equivalent
const oops = new Oops();
await oops.track('config.txt');
// Your editing logic here
const diff = await oops.diff('config.txt');
await oops.keep('config.txt');
```

### Version Updates

When updating the Oops SDK, check workspace compatibility:

```javascript
const version = oops.getVersion();
console.log(`Using Oops ${version}`);

// Validate workspace if needed
const issues = await oops.validateTrackedFiles();
if (issues.length > 0) {
  console.warn('Workspace validation issues:', issues);
}
```

---

**The Oops Core SDK provides the same safety and simplicity as the CLI, but with full programmatic control for integration into your applications and scripts.**