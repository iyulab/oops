# Oops Commands Documentation

## Command Overview

Oops provides **5 essential commands** focused on safe text editing. Each command has a single, clear purpose.

## Essential Commands

### `oops <file>`
Start editing a file safely (auto-initialization).

```bash
oops <file> [options]
oops <pattern>
```

**Options:**
- `-m, --message <msg>` - Backup message
- `--dry-run` - Show what would be tracked without doing it

**Examples:**
```bash
oops config.txt                    # Track single file
oops "*.conf"                     # Track files by pattern  
oops nginx.conf -m "Before SSL"   # With backup message
```

**What it does:**
- Creates workspace if needed (auto-init)
- Creates backup of original file
- Starts tracking file changes
- Ready for editing with any editor

**Smart behavior:**
- **First time**: Creates backup and starts tracking
- **Already tracking**: Shows current status and change summary
- **File changed outside**: Warns and offers options

**Safety notes:**
- File must exist and be readable
- Creates backup before any changes
- Shows helpful next steps in output

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
- Helpful guidance when no changes found

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
- Shows clear success message with next steps
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
- Shows impact warning (lines that will be lost)
- **Current changes will be lost**

---

### `oops status`
See what's being tracked.

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

**What it shows:**
- Which files are tracked
- Whether they've been modified
- Quick summary of changes
- Helpful next steps

## Global Options

Available for all commands:

- `--all` - Apply to all tracked files
- `--yes` - Skip confirmation prompts
- `--quiet` - Minimal output
- `--help` - Show help for command
- `--no-color` - Disable colored output
- `--workspace <path>` - Use specific workspace

## Workflow Examples

### Basic File Editing
```bash
# Start editing safely (auto-creates workspace)
oops config.txt
vim config.txt

# Review changes
oops diff config.txt

# Apply or revert
oops keep config.txt    # ✅ Looks good
# OR
oops undo config.txt    # ❌ Go back to backup
```

### Multiple File Changes
```bash
# Track multiple files
oops database.conf
oops redis.conf
oops nginx.conf

# Edit files with your preferred tools...

# Review all changes
oops status
oops diff --all

# Apply selectively
oops keep database.conf
oops keep redis.conf
oops undo nginx.conf    # This one went wrong
```

### Quick Recovery
```bash
# Check current state
oops status

# See all changes
oops diff --all

# Panic button - revert everything
oops undo --all --yes
```

### Experiment Safely
```bash
# Start tracking for experiments
oops algorithm.py

# Try different approaches...
# Edit with any editor

# Review what changed
oops diff algorithm.py

# Decision time
oops keep algorithm.py   # Good changes
# OR
oops undo algorithm.py   # Nope, go back
```

## Environment Variables

- `OOPS_WORKSPACE` - Default workspace path
- `OOPS_DIFF_TOOL` - Default diff tool (code, vimdiff, meld)
- `NO_COLOR` - Disable colors (any value)

**Examples:**
```bash
# Use persistent workspace in current directory
export OOPS_WORKSPACE=.oops

# Use VS Code for diffs
export OOPS_DIFF_TOOL=code

# Disable colors
export NO_COLOR=1
```

## File Structure

Oops uses temporary workspaces by default:

```
/tmp/oops-a1b2c3d4/      # Random temp directory
├── backups/             # Original file copies
│   ├── config.txt
│   └── nginx.conf
└── tracking.json        # What files we're watching
```

**Benefits:**
- ✅ Auto-cleanup on system reboot
- ✅ No clutter in project directories
- ✅ Isolated per-session workspaces
- ✅ No accidental commits of backup files

**For persistent storage:** Set `OOPS_WORKSPACE=.oops`

## Smart Messages and Guidance

### First-time Usage
```bash
$ oops config.txt        # First time in directory
✨ Creating temporary workspace at /tmp/oops-a1b2c3/
📁 Backup created for config.txt
🎯 Edit with any editor, then run 'oops diff config.txt'
```

### Status-aware Responses
```bash
$ oops config.txt        # Already tracking, no changes
📝 config.txt - No changes yet
💡 Edit the file and run 'oops diff config.txt'

$ oops config.txt        # Already tracking, has changes
📊 config.txt - 5 lines changed
💡 Run 'oops diff config.txt' to see changes
```

### Helpful Completions
```bash
$ oops keep config.txt
✅ Changes kept for config.txt
🧹 Backup cleaned up - file no longer tracked
💡 Run 'oops config.txt' to start tracking again

$ oops undo config.txt
⚠️ This will lose 15 lines of changes in config.txt
❓ Are you sure? (y/N) y
✅ File restored from backup
🧹 Tracking stopped
```

## Safety Guidelines

### Before You Start
1. Simply run `oops <file>` - auto-initialization handles setup
2. Files must exist before tracking
3. Check `oops status` to see what's being tracked

### During Editing
1. Use `oops diff` to review changes before deciding
2. Edit files with any editor you prefer
3. Multiple edit sessions are fine - backup persists

### When Finishing
1. Review changes with `oops diff`
2. Use `oops keep` to apply changes permanently
3. Use `oops undo` to revert to backup
4. Temp workspaces auto-clean on reboot

### Emergency Situations
1. Check current state: `oops status`
2. See all changes: `oops diff --all`
3. Panic button: `oops undo --all --yes`
4. Nuclear option: Reboot (temp cleanup) or manually delete workspace

## Error Messages

### Common Issues
- **"File not found: config.txt"** → File must exist before tracking
- **"File modified outside of oops"** → Use `oops diff` to see external changes
- **"No tracked files"** → Run `oops <file>` to start tracking
- **"Permission denied"** → Check file/directory permissions

### Getting Help
1. Use `oops --help` or `oops <command> --help`
2. Use `oops status` to understand current state
3. Use `oops diff --all` to see all changes
4. Each command provides helpful next-step guidance

## Design Philosophy

### Why Only 5 Commands?

**Simplicity wins.** Each command has one clear purpose:

1. `oops <file>` - "I want to edit this safely"
2. `oops diff` - "What did I change?"
3. `oops keep` - "These changes are good"
4. `oops undo` - "Take me back to the backup"
5. `oops status` - "What am I working on?"

### What Oops Doesn't Do

**Intentionally simple:**
- ❌ Version history - just one backup per file
- ❌ Branching - linear edit/keep/undo workflow
- ❌ Remote sync - local backups only
- ❌ Complex merging - simple restore only
- ❌ File watching - manual check with `diff`

**This is by design.** For complex version control, use Git. For safe quick edits, use Oops.

---

**Remember: The best backup tool is the one you actually use. Oops stays out of your way while keeping you safe.**