# Oops Commands Reference

Complete command documentation for Git-style single file versioning.

## Command Overview

Oops provides **8 essential commands** using familiar Git syntax for complete file versioning lifecycle. If you know Git, you already know Oops.

### All Commands at a Glance

| Command | Purpose | Usage | Git Equivalent | Description |
|---------|---------|-------|----------------|-------------|
| **Core Commands** | | | | |
| `track <file>` | Start versioning | `oops track config.txt` | `git init && git add` | Creates version 1, begins tracking |
| `commit [msg]` | Save checkpoint | `oops commit "update"` | `git commit -m` | Creates next version (2,3,4...) |
| `checkout <ver>` | Navigate history | `oops checkout 2` | `git checkout` | Switch to any version |
| `diff [ver]` | Compare versions | `oops diff 1` | `git diff` | Show changes between versions |
| `log` | View timeline | `oops log` | `git log --oneline` | List all versions chronologically |
| **Completion Commands** | | | | |
| `untrack <file>` | Stop tracking | `oops untrack config.txt` | `rm -rf .git` | Keep current, remove history |
| `keep <file>` | Stop tracking | `oops keep config.txt` | (same as untrack) | Alias for untrack |
| `undo <file> [ver]` | Restore & stop | `oops undo config.txt 2` | `git reset --hard` | Restore version, stop tracking |

### Command Categories

**Core Commands (5)** - Main versioning workflow
- `track <file>` - Start versioning (creates version 1)
- `commit [message]` - Create new version checkpoint  
- `checkout <version>` - Navigate to any version in history
- `diff [version]` - Compare versions and show changes
- `log` - View complete version timeline

**Completion Commands (3)** - End versioning workflow
- `untrack <file>` - Stop tracking, keep current state
- `keep <file>` - Alias for untrack
- `undo <file> [version]` - Restore to version and stop tracking

---

## Core Commands

### `oops track <file>`
**Start versioning a file**

Initialize version management for any text file, creating the initial version.

```bash
oops track config.txt           # Start versioning
oops track /etc/nginx.conf      # Works with absolute paths
oops script.py                  # Short form (auto-detects track)
```

**What it does:**
- Creates workspace automatically (first time)
- Initializes Git repository for the file
- Creates version 1 from current file content
- Sets up invisible versioning infrastructure

**Git equivalent:**
```bash
# Git workflow                  # Oops equivalent
git init                        oops track myfile.txt
git add myfile.txt
git commit -m "Initial version"
```

**Output example:**
```
✓ Started tracking config.txt (version 1)
→ Edit the file and run 'oops commit' to create version 2
```

**Smart behavior:**
- **First time**: Creates version 1 and shows getting started tips
- **Already tracking**: Shows current status and position in history
- **Auto-workspace**: Creates workspace if it doesn't exist

---

### `oops commit [message]`
**Create a new version checkpoint**

Save current state as the next sequential version in history.

```bash
oops commit                     # Auto-generated message
oops commit "added SSL config"  # Custom message
oops commit "fixed bug #123"    # With issue reference
```

**Versioning logic:**
- **Sequential numbering**: 1 → 2 → 3 → 4 → 5...
- **Linear progression**: Each commit creates next number
- **No branching**: Simple, predictable version numbers
- **Smart descriptions**: Analyzes changes if no message provided

**Git equivalent:**
```bash
# Git workflow                  # Oops equivalent
git add .                       oops commit "message"
git commit -m "message"
```

**Output example:**
```
✓ Created version 3: added SSL config
  config.txt: 15 lines added, 3 lines modified
  → Run 'oops log' to see full history
```

**Requirements:**
- File must have changes since last version
- File must be currently tracked

---

### `oops checkout <version>`
**Navigate to any version in history**

Switch file content to any version, allowing you to view or continue from that point.

```bash
oops checkout 1                 # Go to version 1 (original)
oops checkout 3                 # Go to version 3
oops checkout HEAD              # Go to latest version
```

**Navigation behavior:**
- Updates file content immediately
- Shows what version you're now on
- Allows editing and committing from any point
- Creates next sequential version when you commit

**Git equivalent:**
```bash
# Git workflow                  # Oops equivalent
git checkout HEAD~2             oops checkout 3
git checkout main               oops checkout HEAD
git checkout <commit-hash>      oops checkout 5
```

**Output example:**
```
✓ Switched to version 1
  config.txt updated to version 1 content
  → Edit and commit to create version 4
```

**Linear workflow:**
```bash
# At version 3, checkout version 1
oops checkout 1
# Edit file...
oops commit "alternative approach"    # Creates version 4
oops log                             # Shows: 4, 3, 2, 1
```

---

### `oops diff [version]`
**Compare versions and show changes**

Show differences between file states using standard Git diff format.

```bash
oops diff                       # Working changes vs current version
oops diff 1                     # Current file vs version 1
oops diff 1 3                   # Compare version 1 with version 3
oops diff --tool code           # Open in external diff tool
```

**Comparison modes:**
- **No args**: Working changes (if any) vs current version
- **One version**: Current file content vs specified version
- **Two versions**: Compare two specific versions
- **External tools**: Use `--tool` for visual diff viewers

**Git equivalent:**
```bash
# Git workflow                  # Oops equivalent
git diff                        oops diff
git diff HEAD~2                 oops diff 3
git diff HEAD~2 HEAD~1          oops diff 3 2
git difftool --tool=code        oops diff --tool code
```

**Output format:**
- Standard Git diff format (compatible with existing tools)
- Familiar `---`/`+++` headers and `@@` hunks
- Color coding (red for removed, green for added)
- Works with Git-aware editors and tools

**Example output:**
```
diff --git a/config.txt b/config.txt
--- a/config.txt (version 1)
+++ b/config.txt (version 3)
@@ -1,3 +1,4 @@
 host=localhost
 port=8080
+ssl=true
 debug=false
```

---

### `oops log`
**View complete version timeline**

Show chronological history of all versions with Git-style output.

```bash
oops log                        # Full history
oops log --oneline              # Compact format
oops log --graph                # Visual timeline (future)
```

**Display features:**
- All versions in reverse chronological order
- Commit messages and timestamps
- Current position indicator (HEAD)
- Standard Git log format
- Compatible with Git visualization tools

**Git equivalent:**
```bash
# Git workflow                  # Oops equivalent
git log --oneline               oops log
git log --graph --oneline       oops log --graph
git log --decorate              oops log
```

**Example output:**
```
* 5 (HEAD) Final cleanup
* 4 Added SSL config  
* 3 Database settings
* 2 Configuration updates
* 1 Initial version
```

**Timeline navigation:**
```bash
oops log                        # See what's available
oops checkout 2                 # Go to version 2
oops diff 1                     # Compare with original
oops checkout HEAD              # Return to latest
```

---

## Completion Commands

These commands stop version tracking and clean up the workspace.

### `oops untrack <file>`
**Stop tracking, keep current state**

Stop version management while preserving the file in its current state.

```bash
oops untrack config.txt
```

**What it does:**
- Stops version tracking
- Keeps file in current state
- Removes version history and workspace
- File content remains unchanged

**Use cases:**
- Finished experimenting, want to keep current version
- Project complete, no more versioning needed
- Want to clean up workspace

---

### `oops keep <file>`
**Alias for untrack**

Same functionality as `untrack` - stops tracking and keeps current state.

```bash
oops keep config.txt            # Same as untrack
```

**Semantic difference:**
- `untrack`: Technical operation (stop tracking)
- `keep`: Semantic operation (keep this version)

---

### `oops undo <file> [version]`
**Restore to version and stop tracking**

Restore file to a specific version (or latest) and stop version management.

```bash
oops undo config.txt            # Restore to latest version
oops undo config.txt 1          # Restore to version 1
oops undo config.txt 3          # Restore to version 3
```

**What it does:**
- Restores file content to specified version
- Stops version tracking
- Removes version history and workspace
- File content changes to restored version

**Use cases:**
- Want to revert to a known good state
- Experiment went wrong, need to start over
- Want specific version as final state

---

## Version Management

### Simple Sequential System

Oops uses straightforward integer progression:

```
Start: file.txt → Version 1
Edit & commit → Version 2
Edit & commit → Version 3
Edit & commit → Version 4
...and so on
```

**Benefits:**
- **Easy to understand**: No complex branching rules
- **Predictable**: Always know what the next version will be
- **Simple navigation**: `checkout 1`, `checkout 3`, etc.
- **Linear history**: Clear timeline of changes

### Navigation Workflow

```bash
# Complete workflow example
oops track document.txt         # Version 1 created

# Development cycle
vim document.txt
oops commit "first draft"       # Version 2

vim document.txt
oops commit "added intro"       # Version 3

# Go back to experiment
oops checkout 1                 # Switch to version 1
vim document.txt
oops commit "different approach" # Version 4

# Review history
oops log                        # Shows: 4, 3, 2, 1

# Compare versions
oops diff 1 3                   # Original vs intro version
oops diff 1 4                   # Original vs alternative

# Decide and finish
oops checkout 4                 # Use alternative approach
oops keep document.txt          # Stop tracking, keep version 4
```

---

## Command Options

### Global Options

Available with all commands:

```bash
--workspace <path>              # Use specific workspace directory
--verbose, -v                   # Enable verbose output
--quiet, -q                     # Suppress non-error output
--no-color                      # Disable colored output
--help, -h                      # Show command help
```

### Command-Specific Options

**diff command:**
```bash
--tool <tool>                   # Use external diff tool
--no-color                      # Disable diff colors
```

**log command:**
```bash
--oneline                       # Compact one-line format
--graph                         # Visual timeline (future)
```

**Examples:**
```bash
# Use VS Code for diff
oops diff --tool code

# Quiet operation
oops --quiet commit "update"

# Custom workspace
oops --workspace .oops track file.txt
```

---

## Command State Matrix

### What commands work when:

| Current State | Available Commands | Unavailable Commands |
|---------------|-------------------|---------------------|
| **Not tracking** | `track` | All others |
| **Tracking, no changes** | `checkout`, `log`, `diff`, `untrack`, `keep`, `undo` | `commit` (no changes) |
| **Tracking, has changes** | All commands | None |
| **At past version** | All commands | None |

### State transitions:

```bash
# Not tracking → Tracking
oops track file.txt             # Creates version 1

# Tracking → Has changes
vim file.txt                    # Edit file

# Has changes → New version
oops commit                     # Creates version 2

# Any version → Past version
oops checkout 1                 # Navigate to version 1

# Tracking → Not tracking
oops untrack file.txt           # Stop tracking
oops keep file.txt              # Stop tracking (alias)
oops undo file.txt 2            # Restore version 2 and stop
```

---

## Error Handling

### Common Errors and Solutions

**"File not found"**
```bash
oops track missing.txt
# Error: File 'missing.txt' not found
# Solution: Create the file first or use correct path
```

**"File not tracked"**
```bash
oops commit
# Error: No tracked files found
# Solution: Use 'oops track <file>' first
```

**"No changes to commit"**
```bash
oops commit
# Error: No changes detected since last version
# Solution: Edit the file first
```

**"Invalid version"**
```bash
oops checkout 999
# Error: Version 999 does not exist (available: 1, 2, 3)
# Solution: Use 'oops log' to see available versions
```

### Smart Error Messages

Oops provides helpful guidance with every error:

```bash
oops commit
# Error: No changes detected in tracked files
# 
# To create a new version:
#   1. Edit your tracked files
#   2. Run 'oops commit' again
# 
# To see current status:
#   oops log
```

---

## Integration and Compatibility

### Git Tool Compatibility

Oops outputs use standard Git formats:

```bash
# Standard Git diff format
oops diff | less                # Works with pagers
oops diff | git apply           # Can apply diffs
oops diff --tool meld           # External diff viewers

# Standard Git log format
oops log | grep "SSL"           # Search history
oops log --oneline | head -5    # Latest 5 versions
```

### External Diff Tools

Supports any Git-compatible diff tool:

```bash
# Popular diff tools
oops diff --tool code           # VS Code
oops diff --tool vimdiff        # Vim
oops diff --tool meld           # Meld
oops diff --tool beyond         # Beyond Compare

# Configure default tool
export OOPS_DIFF_TOOL=code
oops diff                       # Uses VS Code
```

### Editor Integration

Works seamlessly with any text editor:

```bash
# Command line editors
vim, nano, emacs, micro

# GUI editors
code, subl, atom, notepad++

# IDEs
idea, webstorm, eclipse, vscode
```

---

## Workflow Examples

### Configuration Management

```bash
# Safe system config changes
oops track /etc/nginx/nginx.conf   # Start tracking
sudo vim /etc/nginx/nginx.conf     # Make changes
nginx -t                           # Test configuration
oops commit "enabled SSL"          # Save if test passes

# If something breaks later
oops log                           # See what changed
oops checkout 1                    # Restore working config
sudo systemctl reload nginx       # Apply safe config
```

### Script Development

```bash
# Iterative script development
oops track deploy.sh               # Version 1
vim deploy.sh                      # Add features
oops commit "added backup"         # Version 2
vim deploy.sh                      # More features  
oops commit "added rollback"       # Version 3

# Test different approaches
oops checkout 1                    # Start from original
vim deploy.sh                      # Try different method
oops commit "alternative method"   # Version 4

# Compare approaches
oops diff 2 4                      # Compare backup vs alternative
oops checkout 4                    # Choose alternative
oops keep deploy.sh                # Finish with version 4
```

### Document Writing

```bash
# Essay or documentation
oops track article.md              # Start tracking
vim article.md                     # Write first draft
oops commit "first draft"          # Version 2
vim article.md                     # Revisions
oops commit "added examples"       # Version 3

# Major restructure
oops checkout 2                    # Back to first draft
vim article.md                     # Reorganize completely
oops commit "restructured"         # Version 4

# Compare versions
oops diff 2 3                      # Draft vs examples
oops diff 2 4                      # Draft vs restructured
oops checkout 4                    # Use restructured version
```

---

## Command Design Principles

1. **Git Familiarity**: Use commands developers already know
2. **Linear Simplicity**: Sequential numbering without complex branching
3. **Standard Output**: Git-compatible formats for tool integration
4. **Smart Defaults**: Minimal required arguments, helpful guidance
5. **Safe Operations**: Atomic commits, easy navigation, clear errors

The goal is to provide powerful single-file versioning using familiar Git commands with simplified workflow.

---

## Quick Reference

### Essential Workflow
```bash
oops track <file>               # Start (version 1)
# edit file...
oops commit ["message"]         # Next version
oops log                        # See history
oops checkout <version>         # Navigate
oops diff [version]             # Compare
oops keep <file>                # Finish
```

### Navigation
```bash
oops log                        # See all versions
oops checkout 1                 # Go to version 1
oops checkout HEAD              # Go to latest
oops diff 1 3                   # Compare versions
```

### Completion
```bash
oops untrack <file>             # Stop, keep current
oops keep <file>                # Same as untrack
oops undo <file> [version]      # Restore and stop
```

**Remember**: If you know Git commands, you already know Oops!