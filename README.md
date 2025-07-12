# Oops - Safe Text Editing Made Simple

**One backup away from fearless editing.**

Oops provides just enough safety net for confident text file editing. No complex versioning, no steep learning curve - just simple backup and undo.

## Core Philosophy

- **Start immediately** - No setup required
- **Stay simple** - 5 essential commands maximum  
- **Feel safe** - Always have a way back
- **Get out of the way** - Minimal interference with your workflow

## Quick Start

```bash
# Start editing safely (auto-creates workspace and backup)
oops config.txt
# ... edit with any editor ...

# See what changed
oops diff config.txt

# Keep changes or go back to backup
oops keep config.txt    # Apply changes
oops undo config.txt    # Restore backup
```

## Installation

```bash
npm install -g @iyulab/oops-cli
```

## Essential Commands (5 Total)

### `oops <file>`
Start editing a file safely.

```bash
oops config.txt           # Begin safe editing
oops nginx.conf          # Works with any text file
oops *.conf              # Multiple files with patterns
```

**What happens:**
- Creates workspace if needed (auto-init)
- Makes backup of original file
- Ready for editing with any editor

**Smart behavior:**
- First time: Creates backup and starts tracking
- Already tracking: Shows current status
- File changed outside: Warns and offers options

---

### `oops diff [file]`
See what changed.

```bash
oops diff config.txt      # Changes in specific file
oops diff                # Changes in all tracked files
```

**Shows:**
- Added/removed/modified lines
- Simple color-coded output
- Line numbers and context

---

### `oops keep <file>`
Keep the changes (delete backup).

```bash
oops keep config.txt      # Apply changes, remove backup
oops keep --all          # Keep all tracked files
```

**Result:**
- Changes become permanent
- Backup is deleted
- File stops being tracked

---

### `oops undo <file>`
Go back to backup (lose changes).

```bash
oops undo config.txt      # Restore from backup
oops undo --all          # Undo all tracked files
```

**Result:**
- File restored to original state
- Current changes are lost (with warning)
- Backup is deleted, tracking stops

---

### `oops status`
See what's being tracked.

```bash
oops status              # Show all tracked files
```

**Shows:**
- Which files are tracked
- Whether they've been modified
- Quick summary of changes

## Usage Examples

### Basic Workflow
```bash
# Start editing safely
oops nginx.conf
vim nginx.conf

# Check what changed
oops diff nginx.conf

# Decision time
oops keep nginx.conf     # ✅ Looks good, keep it
# OR
oops undo nginx.conf     # ❌ Oops, go back to backup
```

### Multiple Files
```bash
# Edit several config files
oops database.conf
oops redis.conf
oops nginx.conf

# Edit them with your preferred tools...

# Review all changes
oops status
oops diff

# Keep some, undo others
oops keep database.conf
oops keep redis.conf  
oops undo nginx.conf     # This one went wrong
```

### Quick Recovery
```bash
# Oh no, what was I doing?
oops status              # See what's tracked

# See all my changes
oops diff

# Everything looks wrong, start over
oops undo --all
```

## Global Options

Simple options that work with any command:

- `--all` - Apply to all tracked files
- `--yes` - Skip confirmation prompts
- `--quiet` - Minimal output
- `--help` - Show help for command

```bash
oops diff --all          # See all changes
oops keep --all --yes    # Keep everything, no prompts
oops status --quiet      # Just the file names
```

## Smart Behaviors

### Auto-Initialization
No need for `init` - temporary workspace created automatically:

```bash
$ oops config.txt        # First time in directory
✨ Creating temporary workspace at /tmp/oops-a1b2c3/
📁 Backup created for config.txt
🎯 Ready to edit safely!
```

### Helpful Messages
Clear, friendly output that guides you:

```bash
$ oops diff config.txt   # No changes yet
📝 config.txt - No changes yet
💡 Edit the file and run this again

$ oops keep config.txt   # Successful keep
✅ Changes kept for config.txt
🧹 Backup cleaned up
```

### Safety Warnings
Protection against common mistakes:

```bash
$ oops undo config.txt   # About to lose changes
⚠️  This will lose 15 lines of changes in config.txt
❓ Are you sure? (y/N)

$ oops config.txt        # File changed outside oops
🔄 config.txt was modified outside of oops
💡 Run 'oops diff config.txt' to see external changes
```

## Configuration (Optional)

Oops works great with zero configuration using temporary workspaces by default:

```bash
# Force persistent workspace in current directory (optional)
export OOPS_WORKSPACE=.oops

# Use specific temporary location (optional)  
export OOPS_WORKSPACE=/custom/tmp/path

# Set preferred diff tool (optional)
export OOPS_DIFF_TOOL=code

# Disable colors (optional)
export NO_COLOR=1
```

**Default behavior:** Uses system temporary directory (`/tmp/oops-randomid/`) that auto-cleans on reboot.

## What Oops Doesn't Do

**Intentionally simple:**
- ❌ Version history - just one backup per file
- ❌ Branching - linear edit/keep/undo workflow
- ❌ Remote sync - local backups only
- ❌ Complex merging - simple restore only
- ❌ File watching - manual check with `diff`

**This is by design.** For complex version control, use Git. For safe quick edits, use Oops.

## Common Patterns

### System Config Files
```bash
# Editing critical system files
sudo oops /etc/nginx/nginx.conf
sudo vim /etc/nginx/nginx.conf
sudo oops diff /etc/nginx/nginx.conf
sudo oops keep /etc/nginx/nginx.conf
# Backups stored in temp - no cleanup needed!
```

### Development Configs
```bash
# Database migration scripts
oops migration.sql
# ... edit in your IDE ...
oops diff migration.sql  # Review before running
oops keep migration.sql  # Looks good
```

### Experiment Safely
```bash
# Try different approaches
oops algorithm.py
# ... experiment with changes ...
oops diff algorithm.py   # See what I tried
oops undo algorithm.py   # Nope, go back
```

### Bulk Config Updates
```bash
# Update multiple environment files
oops .env*
# ... edit .env.dev, .env.prod, .env.test ...
oops status              # See what changed
oops diff                # Review all changes
oops keep --all          # Deploy all changes
```

## Emergency Commands

When things go wrong:

```bash
# What am I tracking?
oops status

# What changed everywhere?
oops diff --all

# Panic button - undo everything
oops undo --all --yes

# Nuclear option - let temp cleanup handle it
# (Temp workspace auto-cleans on reboot)
```

## File Structure

Oops keeps it simple with temporary storage by default:

```
/tmp/oops-a1b2c3d4/      # Random temp directory
├── backups/             # Original file copies
│   ├── config.txt
│   └── nginx.conf
└── tracking.json        # What files we're watching
```

**Benefits of temp storage:**
- ✅ Auto-cleanup on system reboot
- ✅ No clutter in project directories  
- ✅ Isolated per-session workspaces
- ✅ No accidental commits of backup files

**For persistent storage:** Set `OOPS_WORKSPACE=.oops` to use current directory.

## Why Only 5 Commands?

**Simplicity wins.** Each command has one clear purpose:

1. `oops <file>` - "I want to edit this safely"
2. `oops diff` - "What did I change?"  
3. `oops keep` - "These changes are good"
4. `oops undo` - "Take me back to the backup"
5. `oops status` - "What am I working on?"

More commands = more complexity = higher chance of mistakes. Oops keeps you focused on what matters: editing files without fear.

## Architecture

Oops follows a **simplicity-first** approach:

- **Single Purpose**: Safe text file editing only
- **Zero Learning Curve**: Intuitive commands matching mental models
- **Atomic Operations**: All-or-nothing changes to prevent corruption
- **Workspace Isolation**: Each project operates independently
- **Git Foundation**: Leverages Git infrastructure without exposing complexity

## Development

```bash
# Clone and install
git clone https://github.com/iyulab/oops
cd oops
npm install

# Build and test
npm run build
npm test

# Run locally
npm run dev -- config.txt
```

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) and ensure all tests pass.

## License

MIT © [IyuLab](https://github.com/iyulab)

---

**Remember:** The best backup tool is the one you actually use. Oops stays out of your way while keeping you safe.