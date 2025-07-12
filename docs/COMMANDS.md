# Oops Commands Documentation

## Command Overview

Oops provides **12 essential commands** focused on safe text editing. Commands are organized by frequency of use and workflow stage.

## Core Workflow Commands

### `oops init`
Initialize a workspace for safe editing.

```bash
oops init [options]
```

**Options:**
- `--temp` - Use temporary directory instead of `.oops/`
- `--workspace <path>` - Specify custom workspace location
- `-f, --force` - Overwrite existing workspace

**Examples:**
```bash
oops init                    # Create .oops/ in current dir
oops init --temp            # Use system temp directory  
oops init --workspace /tmp  # Custom location
```

**What it does:**
- Creates workspace directory structure
- Initializes configuration files
- Sets up default ignore patterns

---

### `oops begin <file>`
Start tracking a file for safe editing.

```bash
oops begin <file> [options]
oops begin <pattern>
```

**Options:**
- `-m, --message <msg>` - Backup message
- `--dry-run` - Show what would be tracked without doing it

**Examples:**
```bash
oops begin config.txt                    # Track single file
oops begin "*.conf"                     # Track files by pattern
oops begin nginx.conf -m "Before SSL"   # With backup message
```

**What it does:**
- Creates backup of original file
- Initializes Git repository for the file
- Starts tracking file changes

**Safety notes:**
- File must exist and be readable
- Creates backup before any changes
- Warns if file is already being tracked

---

### `oops diff [file]`
Show changes between backup and current file.

```bash
oops diff [file] [options]
```

**Options:**
- `--tool <tool>` - Use external diff tool (code, vimdiff, meld)
- `--no-color` - Disable colored output
- `-a, --all` - Show diff for all tracked files

**Examples:**
```bash
oops diff config.txt          # Show changes for specific file
oops diff --all              # Show all changes
oops diff --tool code        # Open in VS Code
```

**What it shows:**
- Line-by-line differences
- Added/removed/modified lines
- File statistics (lines changed)

---

### `oops keep <file>`
Apply changes and stop tracking the file.

```bash
oops keep <file> [options]
oops keep --all
```

**Options:**
- `-m, --message <msg>` - Completion message
- `--all` - Keep changes for all tracked files
- `-y, --yes` - Skip confirmation prompt

**Examples:**
```bash
oops keep config.txt                     # Keep changes
oops keep --all                         # Keep all changes
oops keep config.txt -m "SSL enabled"   # With message
```

**What it does:**
- Finalizes changes to the file
- Removes tracking and backup data
- **Irreversible operation** - prompts for confirmation

**Safety notes:**
- Always prompts for confirmation unless `-y` used
- Creates final backup before cleanup
- Cannot be undone after completion

---

### `oops undo <file>`
Revert file to backup and stop tracking.

```bash
oops undo <file> [options]
oops undo --all
```

**Options:**
- `--all` - Undo changes for all tracked files
- `-y, --yes` - Skip confirmation prompt
- `--save-current` - Backup current state before undo

**Examples:**
```bash
oops undo config.txt                 # Revert to backup
oops undo --all                     # Revert all files
oops undo config.txt --save-current # Backup current first
```

**What it does:**
- Restores file from backup
- Optionally saves current state
- Removes tracking data

**Safety notes:**
- Always prompts for confirmation unless `-y` used
- By default, saves current state as `.bak` file
- **Current changes will be lost**

---

### `oops abort <file>`
Stop tracking without applying or reverting changes.

```bash
oops abort <file> [options]
oops abort --all
```

**Options:**
- `--all` - Abort tracking for all files
- `-y, --yes` - Skip confirmation prompt

**Examples:**
```bash
oops abort config.txt    # Stop tracking, keep current state
oops abort --all        # Abort all tracking
```

**What it does:**
- Stops tracking the file
- Leaves current file unchanged
- Removes backup and tracking data

**Use when:**
- You want to keep current changes but stop using Oops
- You'll handle the file with different tools
- You made changes but don't need the backup anymore

## Status and Information Commands

### `oops` / `oops list`
Show files in current directory with tracking status.

```bash
oops [options]
```

**Options:**
- `-a, --all` - Include hidden files
- `-t, --tracked` - Show only tracked files

**Example output:**
```
Files in current directory:
  config.txt        [tracked - modified]
  script.sh         [tracked - clean]  
  README.md         
  temp.log          [ignored]
* .oops/          [workspace]
```

---

### `oops status`
Show detailed status of tracked files.

```bash
oops status [options]
```

**Options:**
- `-v, --verbose` - Include file paths and timestamps
- `-s, --short` - Compact output format

**Example output:**
```
Tracking Status:
  config.txt      modified    (15 lines changed)
  script.sh       clean       (no changes)
  nginx.conf      modified    (3 lines changed)

Summary: 3 tracked, 2 modified, 1 clean
```

---

### `oops which`
Show current workspace location.

```bash
oops which [options]
```

**Options:**
- `-v, --verbose` - Show additional workspace info

**Example output:**
```
Workspace: /tmp/oops-project-a1b2c3d4/
Type: temporary
Created: 2025-07-11 14:30:00
Files tracked: 3
```

## Configuration and Maintenance

### `oops config`
Manage Oops configuration.

```bash
oops config [key] [value] [options]
```

**Options:**
- `--list` - Show all configuration
- `--reset` - Reset to defaults

**Key settings:**
```bash
oops config workspace.temp true        # Use temp directories
oops config safety.confirmKeep false   # Skip keep confirmations  
oops config safety.confirmUndo false   # Skip undo confirmations
oops config diff.tool code            # Default diff tool
```

**Example:**
```bash
oops config --list                    # Show all settings
oops config diff.tool                # Show specific setting
oops config diff.tool vimdiff        # Change setting
```

---

### `oops clean`
Clean up workspace and temporary files.

```bash
oops clean [options]
```

**Options:**
- `--all` - Remove entire workspace
- `--temp` - Clean only temporary files
- `--dry-run` - Show what would be cleaned
- `-f, --force` - Skip confirmation

**Examples:**
```bash
oops clean --temp       # Clean temp files only
oops clean --all        # Remove everything
oops clean --dry-run    # Preview cleanup
```

**Safety notes:**
- Always shows what will be deleted
- Prompts for confirmation unless `--force`
- **Cannot recover deleted tracking data**

---

### `oops help`
Show help information.

```bash
oops help [command]
```

**Examples:**
```bash
oops help           # General help
oops help begin     # Help for specific command
```

## Global Options

Available for all commands:

- `-v, --verbose` - Detailed output
- `-q, --quiet` - Minimal output  
- `--no-color` - Disable colored output
- `--workspace <path>` - Use specific workspace
- `--version` - Show version information

## Configuration Files

### Workspace Config (`.oops/config.json`)
```json
{
  "workspace": {
    "useTemp": false,
    "path": null
  },
  "safety": {
    "confirmKeep": true,
    "confirmUndo": true,
    "autoBackup": true
  },
  "diff": {
    "tool": "auto",
    "context": 3
  }
}
```

### Ignore Patterns (`.oops/ignore`)
```
# Automatic ignores
*.log
*.tmp
*.swp
*~
.DS_Store
node_modules/
.git/

# Custom patterns can be added here
```

## Environment Variables

- `OOPS_WORKSPACE` - Default workspace path
- `OOPS_EDITOR` - Default text editor
- `OOPS_DIFF_TOOL` - Default diff tool
- `OOPS_NO_COLOR` - Disable colors (any value)

## Workflow Examples

### Basic File Editing
```bash
# Setup
oops init
oops begin config.txt

# Edit file with your editor
vim config.txt

# Review and apply
oops diff config.txt
oops keep config.txt
```

### Multiple File Changes
```bash
# Track multiple files
oops begin "*.conf"
oops status

# Edit files...

# Review all changes
oops diff --all

# Apply selectively
oops keep nginx.conf
oops undo apache.conf
oops abort redis.conf
```

### Using Temporary Workspace
```bash
# Use temp directory (good for experiments)
oops init --temp
oops which  # Shows temp location

# Work normally
oops begin test.txt
# ... edit ...
oops keep test.txt

# Auto-cleanup when done
oops clean --all
```

### Emergency Recovery
```bash
# Check what's being tracked
oops status

# See all changes
oops diff --all

# Revert everything to backup
oops undo --all

# Or clean up completely
oops clean --all --force
```

## Safety Guidelines

### Before You Start
1. Always run `oops init` in your project directory
2. Use `oops begin` before editing important files
3. Check `oops status` to see what's being tracked

### During Editing
1. Use `oops diff` to review changes before committing
2. Save current state with `oops abort` if unsure
3. Don't manually delete `.oops/` while files are tracked

### When Finishing
1. Review changes with `oops diff` 
2. Use `oops keep` to apply changes permanently
3. Use `oops undo` to revert to backup
4. Clean up with `oops clean` when done

### Emergency Situations
1. If Oops seems corrupted: `oops clean --all --force`
2. If files are missing: Check `.oops/files/` for backups
3. If workspace is lost: Backups are in Git repositories under workspace

## Error Messages

### Common Issues
- **"No workspace found"** → Run `oops init`
- **"File not tracked"** → Run `oops begin <file>` first  
- **"File already tracked"** → Use `oops abort` then `oops begin` again
- **"Permission denied"** → Check file/directory permissions
- **"Workspace corrupted"** → Run `oops clean --all` and start over

### Getting Help
1. Use `oops help <command>` for command-specific help
2. Use `oops status` to understand current state
3. Use `oops which` to find workspace location
4. Check logs in workspace directory for detailed errors

---

**Remember: Oops is designed to be simple and safe. When in doubt, use `oops status` and `oops diff` to understand the current state before making changes.**