# @iyulab/oops-cli

CLI for Oops - Safe text file editing with automatic backup and simple undo.

## Installation

```bash
# Global installation (recommended)
npm install -g @iyulab/oops-cli

# Local installation
npm install @iyulab/oops-cli
```

## Quick Start

```bash
# Start tracking a file (creates backup automatically)
oops config.txt

# Edit the file with your preferred editor
nano config.txt

# Check what changed
oops diff config.txt

# Apply changes permanently
oops keep config.txt

# Or undo changes back to backup
oops undo config.txt

# Check status of all tracked files
oops status
```

## Commands

### Core Workflow

#### `oops <file>`
Start tracking a file safely. Creates a backup and initializes workspace if needed.

```bash
oops myfile.txt
oops src/config.js
oops /path/to/important.conf
```

#### `oops diff [file]`
Show changes in tracked files.

```bash
oops diff              # Show all changes
oops diff config.txt   # Show changes in specific file
```

#### `oops keep <file>`
Apply changes and stop tracking the file.

```bash
oops keep config.txt
```

#### `oops undo <file>`
Revert file to backup and stop tracking.

```bash
oops undo config.txt
```

#### `oops status`
Show status of all tracked files and workspace information.

```bash
oops status
```

## Options

### Global Options

- `-V, --version` - Show version number
- `-v, --verbose` - Enable verbose output
- `-q, --quiet` - Suppress output
- `--no-color` - Disable colored output
- `--workspace <path>` - Use specific workspace path
- `--yes` - Skip confirmation prompts
- `-h, --help` - Display help

### Command-Specific Options

#### diff
- `--tool <tool>` - Use external diff tool (code, vimdiff, meld)
- `--no-color` - Disable colored diff output

#### keep
- `--no-confirm` - Skip confirmation prompt

#### undo  
- `--no-confirm` - Skip confirmation prompt

## Environment Variables

- `OOPS_WORKSPACE` - Workspace path (default: temp directory)
- `OOPS_DIFF_TOOL` - External diff tool (code, vimdiff, meld)
- `NO_COLOR` - Disable colored output

## Examples

### Basic Workflow

```bash
# Start tracking
oops nginx.conf
# → ✨ Creating temporary workspace at: /tmp/oops-abc123
# → 📁 Starting to track: nginx.conf
# → 💾 Backup created: .oops/files/def456/backup

# Make changes
vim nginx.conf

# Review changes
oops diff nginx.conf
# → Shows colored diff output

# Apply changes
oops keep nginx.conf
# → ✅ Changes applied to nginx.conf
```

### Multiple Files

```bash
# Track multiple files
oops config.js
oops package.json
oops README.md

# Check status
oops status
# → Workspace: /tmp/oops-abc123 (3 files tracked)
# → 📝 config.js - modified
# → 📝 package.json - modified  
# → 📄 README.md - clean

# Review all changes
oops diff
# → Shows changes for all modified files
```

### External Diff Tool

```bash
# Use VS Code for diff
oops diff --tool code config.txt

# Set environment variable
export OOPS_DIFF_TOOL=vimdiff
oops diff config.txt
```

### Workspace Management

```bash
# Use custom workspace
oops --workspace ./my-workspace config.txt

# Set via environment
export OOPS_WORKSPACE=/path/to/workspace
oops config.txt
```

## Safety Features

- **Automatic Backup**: Every tracked file gets a backup before changes
- **Workspace Isolation**: Each project operates independently  
- **Confirmation Prompts**: Safety prompts for destructive operations
- **Health Checks**: Automatic detection of workspace corruption
- **Atomic Operations**: All-or-nothing changes to prevent partial failures

## Integration

### Editor Integration

The CLI works well with any text editor:

```bash
# With vim
oops config.txt && vim config.txt && oops diff config.txt

# With VS Code  
oops package.json && code package.json

# With nano
oops .bashrc && nano .bashrc && oops keep .bashrc
```

### Scripts

```bash
#!/bin/bash
# Safe config editing script

FILE="$1"
oops "$FILE"
$EDITOR "$FILE"

echo "Review changes:"
oops diff "$FILE"

read -p "Apply changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    oops keep "$FILE"
    echo "✅ Changes applied"
else
    oops undo "$FILE"  
    echo "↩️ Changes reverted"
fi
```

## Troubleshooting

### Common Issues

**File not found error**
```bash
oops: error: File does not exist: nonexistent.txt
```
Make sure the file path is correct and the file exists.

**Permission denied**
```bash
oops: error: Permission denied: /etc/passwd
```
Ensure you have read/write permissions for the file.

**Workspace corruption**
```bash
oops: error: Workspace corrupted, please run: oops clean
```
The workspace has integrity issues. Clean and reinitialize.

### Getting Help

```bash
oops help              # General help
oops help status       # Command-specific help
oops --help            # Options and examples
```

## License

MIT - see [LICENSE](./LICENSE) for details.

## Repository

[https://github.com/iyulab/oops](https://github.com/iyulab/oops)