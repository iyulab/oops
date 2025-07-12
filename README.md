# Oops

**Safe text file editing with automatic backup and simple undo.**

Oops provides a safety net for text file editing by creating automatic backups and allowing easy rollback. Perfect for configuration files, scripts, and any text that you want to edit safely.

## Quick Start

```bash
# Initialize workspace
oops init

# Start editing a file safely
oops begin config.txt
# ... edit the file with your preferred editor ...

# Check what changed
oops diff config.txt

# Keep changes or undo them
oops keep config.txt    # Apply changes
oops undo config.txt    # Revert to backup
```

## Installation

```bash
npm install -g @iyulab/oops-cli
```

## Why Oops?

- 🔒 **Automatic backups** before you start editing
- 🔄 **Simple undo** to revert any mistakes  
- 📊 **Visual diff** to see exactly what changed
- ⚡ **Lightweight** - no complex setup required
- 🎯 **File-focused** - works with any text editor

## Core Commands

```bash
oops init              # Set up workspace
oops begin <file>      # Start tracking a file
oops diff <file>       # Show changes
oops keep <file>       # Apply changes
oops undo <file>       # Revert to backup
oops status            # Show tracked files
```

## Example Workflow

```bash
# Working on nginx configuration
oops begin /etc/nginx/nginx.conf
vim /etc/nginx/nginx.conf

# Check changes before applying
oops diff /etc/nginx/nginx.conf

# Looks good? Apply them
oops keep /etc/nginx/nginx.conf

# Made a mistake? Undo instead
oops undo /etc/nginx/nginx.conf
```

## How It Works

Oops creates a hidden workspace (`.oops` or temp directory) where it stores backups using Git. When you `begin` tracking a file, it makes a backup. When you `keep` changes, it cleans up. When you `undo`, it restores from backup.

No complex branching, no version history to manage - just simple, safe editing.

## Configuration

```bash
oops config workspace.temp true    # Use temp directory
oops config diff.tool code        # Use VS Code for diffs
oops config confirm.actions false # Skip confirmations
```

## Safety Features

- **Atomic operations** - changes are applied completely or not at all
- **Automatic backups** - your original files are never lost
- **Confirmation prompts** - prevents accidental data loss
- **Workspace isolation** - each project gets its own backup space