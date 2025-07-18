# Oops CLI Documentation

The Oops CLI provides Git-style single file versioning with simple commands and linear version progression.

## Installation

```bash
# Install globally via npm
npm install -g @iyulab/oops-cli

# Or run directly with npx
npx @iyulab/oops-cli --help
```

## Quick Start

```bash
# Start versioning a file
oops track config.txt

# Edit with any editor
vim config.txt

# Commit changes
oops commit "added new configuration"

# View history
oops log

# Navigate to previous version
oops checkout 1

# Return to latest
oops checkout HEAD
```

## Core Commands

Oops provides **8 essential commands** using familiar Git syntax:

### 1. `oops track <file>` - Start Versioning

Begin version management for a file, creating the initial version.

```bash
oops track <file>              # Start versioning
oops track config.txt          # Example
oops config.txt                # Short form
```

**What it does:**
- Creates workspace automatically (first time)
- Initializes Git repository for the file
- Creates version 1 from current file content
- Shows helpful next steps

**Output example:**
```
✓ Started tracking config.txt (version 1)
→ Edit the file and run 'oops commit' to create version 2
```

### 2. `oops commit [message]` - Create New Version

Save current state as a new version in the history.

```bash
oops commit                     # Auto-generated message
oops commit "added SSL config"  # Custom message
```

**What it does:**
- Creates next sequential version (2, 3, 4...)
- Commits changes to Git repository
- Tags with version number
- Shows version created

**Output example:**
```
✓ Created version 3: added SSL config
  config.txt: 15 lines added, 3 lines modified
```

### 3. `oops checkout <version>` - Navigate History

Switch to any version in the file's history.

```bash
oops checkout 1                 # Go to version 1
oops checkout 3                 # Go to version 3  
oops checkout HEAD              # Go to latest version
```

**What it does:**
- Updates file content to specified version
- Shows what version you're now on
- Allows editing from any point in history

**Output example:**
```
✓ Switched to version 1
  config.txt updated to version 1 content
  → Edit and commit to create version 4
```

### 4. `oops diff [version]` - Show Changes

Compare current file with a version or show working changes.

```bash
oops diff                       # Working changes vs current version
oops diff 1                     # Current file vs version 1
oops diff 1 3                   # Compare version 1 with version 3
```

**What it shows:**
- Standard Git diff format
- Line-by-line differences
- Addition and deletion statistics

**Output example:**
```
diff --git a/config.txt b/config.txt
--- a/config.txt
+++ b/config.txt
@@ -1,3 +1,4 @@
 host=localhost
 port=8080
+ssl=true
 debug=false
```

### 5. `oops log` - View History

Show complete version history with Git-style output.

```bash
oops log                        # Full history
oops log --oneline              # Compact format
oops log --graph                # Visual graph
```

**What it shows:**
- All versions in chronological order
- Commit messages and timestamps
- Current position indicator

**Output example:**
```
* 3 (HEAD) added SSL config
* 2 updated port settings  
* 1 initial version
```

## Completion Commands

These commands stop version tracking and clean up:

### 6. `oops untrack <file>` - Stop Tracking

Stop version management, keeping current file state.

```bash
oops untrack config.txt
```

**What it does:**
- Stops version tracking
- Keeps file in current state
- Removes version history and workspace

### 7. `oops keep <file>` - Alias for Untrack

Same as untrack - stops tracking and keeps current state.

```bash
oops keep config.txt            # Same as untrack
```

### 8. `oops undo <file> [version]` - Restore and Stop

Restore file to a version and stop tracking.

```bash
oops undo config.txt            # Restore to latest version
oops undo config.txt 1          # Restore to version 1
```

**What it does:**
- Restores file to specified version (or latest)
- Stops version tracking
- Removes version history

## Version Management

### Simple Linear Progression

Oops uses simple sequential numbering:

```
1 → 2 → 3 → 4 → 5 → 6...
```

**Benefits:**
- Easy to understand and remember
- No complex branching or merging
- Each commit creates the next number
- Clear timeline of changes

### Navigation Workflow

```bash
# Start versioning
oops track script.py            # Creates version 1

# Make changes and commit
vim script.py
oops commit "added function"    # Creates version 2

# Continue development  
vim script.py
oops commit "fixed bug"         # Creates version 3

# Go back to experiment
oops checkout 1                 # Switch to version 1
vim script.py
oops commit "alternative fix"   # Creates version 4

# View complete history
oops log                        # Shows: 4, 3, 2, 1
```

## Global Options

Available with all commands:

```bash
--workspace <path>              # Use specific workspace directory
--verbose, -v                   # Enable verbose output
--quiet, -q                     # Suppress non-error output  
--no-color                      # Disable colored output
--help, -h                      # Show help
--version, -V                   # Show version
```

## Environment Variables

Configure Oops behavior:

```bash
export OOPS_WORKSPACE=.oops     # Use persistent workspace
export OOPS_DIFF_TOOL=code      # External diff tool
export NO_COLOR=1               # Disable colors
```

## Workspace Structure

Oops creates isolated workspaces:

```
.oops/                          # Workspace directory
├── config.json                 # Workspace configuration
├── state.json                  # Tracking state
└── files/                      # Per-file version storage
    └── <file-hash>/            # Isolated file versioning
        ├── .git/               # Git repository for this file
        ├── backup              # Original file backup
        └── metadata.json       # File versioning metadata
```

## Common Workflows

### Basic Version Management

```bash
# Start versioning
oops track document.txt

# Development cycle
vim document.txt
oops commit "first draft"

vim document.txt  
oops commit "added introduction"

vim document.txt
oops commit "completed section 1"

# Review history
oops log

# Navigate and compare
oops checkout 1
oops diff 3
oops checkout HEAD
```

### Experimental Development

```bash
# Current stable version
oops track algorithm.py         # Version 1

# Try new approach
vim algorithm.py
oops commit "new algorithm"     # Version 2

# Go back and try different approach
oops checkout 1
vim algorithm.py
oops commit "optimized version" # Version 3

# Compare approaches
oops diff 1 2                   # Original vs new algorithm
oops diff 1 3                   # Original vs optimized

# Choose best version
oops checkout 3                 # Use optimized version
oops keep algorithm.py          # Stop tracking, keep current
```

### Safe Configuration Changes

```bash
# Start tracking system config
oops track /etc/nginx/nginx.conf

# Make changes
sudo vim /etc/nginx/nginx.conf
nginx -t                        # Test configuration

# Commit if test passes
oops commit "enabled SSL"

# If something breaks later
oops log                        # See what changed
oops checkout 1                 # Restore working config
sudo systemctl reload nginx    # Apply safe config
```

## Tool Integration

### Git Compatibility

Oops outputs use standard Git formats:

```bash
# Standard Git diff format
oops diff | less

# Git log format
oops log --oneline --graph

# Works with Git-aware tools
oops diff | git apply --reverse
```

### External Diff Tools

```bash
# Use VS Code for diffs
oops diff --tool code

# Use Meld
oops diff --tool meld

# Configure default tool
export OOPS_DIFF_TOOL=vimdiff
```

### Editor Integration

Works with any editor:

```bash
# Command line editors
vim, nano, emacs

# GUI editors  
code, subl, atom

# IDEs
idea, webstorm, eclipse
```

## Error Handling

### Common Errors

**"File not found"**
- File must exist before tracking
- Use absolute path if not in current directory

**"No changes to commit"**
- File content hasn't changed since last commit
- Edit the file first

**"File not tracked"**
- Use `oops track <file>` to start versioning first

**"Invalid version"**
- Version must be a number (1, 2, 3...) or "HEAD"
- Use `oops log` to see available versions

### Recovery

```bash
# Check current state
oops log

# See what's being tracked
ls .oops/files/

# Emergency restore
oops undo <file> 1              # Restore to first version

# Fresh start
rm -rf .oops
oops track <file>               # Restart versioning
```

## Advanced Usage

### Multiple Files

```bash
# Track multiple files independently
oops track config.txt
oops track script.py
oops track README.md

# Each file has independent version history
oops log config.txt             # History for config.txt only
oops log script.py              # History for script.py only
```

### Workspace Management

```bash
# Check workspace status
oops status

# Custom workspace location
oops --workspace /project/.oops track file.txt

# Persistent workspace
export OOPS_WORKSPACE=.oops
oops track file.txt
```

### Performance

```bash
# For large files, use --quiet
oops --quiet commit

# External diff for large changes
oops diff --tool meld
```

## Comparison with Git

| Aspect | Oops | Git |
|--------|------|-----|
| Learning curve | Minimal (if you know Git) | Steep |
| File scope | Single files | Entire repositories |
| Version format | Sequential numbers | SHA hashes |
| Branching | None (linear only) | Complex branching |
| Setup | Auto-initialization | Manual repository setup |
| Commands | 8 essential commands | 100+ commands |

## API Integration

For programmatic usage:

```javascript
const { Oops } = require('@iyulab/oops');

const oops = new Oops();

// Start versioning
await oops.trackWithVersion('config.txt', 'Initial version');

// Create new versions
await oops.commitVersion('config.txt', 'Updated config');

// Navigate history
await oops.checkoutVersion('config.txt', 1);

// Get version history
const versions = await oops.getVersionHistory('config.txt');
```

See [CORE.md](./CORE.md) for complete SDK documentation.

---

**Oops provides powerful single-file versioning using familiar Git commands with simplified linear workflow.**