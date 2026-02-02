# Oops - Simple File Versioning for Everyone 🎯

**Oops! Made a mistake? No worries - you can always go back!**

A single binary with zero runtime dependencies. No Git installation required.

## Installation

```bash
go install github.com/iyulab/oops@latest
```

Or download from [GitHub Releases](https://github.com/iyulab/oops/releases).

## Quick Start

```bash
oops start essay.txt          # 👀 Start versioning
# ... write something ...
oops save "first draft"       # 📸 Save a snapshot
# ... edit more ...
oops save "added conclusion"  # 📸 Save another
oops history                  # 📜 View all snapshots
oops oops!                    # ↩️  Made a mistake? Go back!
```

## Commands

| Command | Git-style | Description |
|---------|-----------|-------------|
| `oops start <file>` | `track` | 👀 Start versioning a file |
| `oops save [message]` | `commit` | 📸 Save a snapshot |
| `oops back <N>` | `checkout` | ⏪ Go back to snapshot #N |
| `oops oops!` | - | ↩️ Undo (restore last saved state) |
| `oops history` | `log` | 📜 View all snapshots |
| `oops changes` | `diff` | 🔍 See what changed |
| `oops now` | `status` | ℹ️ Show current status |
| `oops files` | `ls` | 📁 List tracked files |
| `oops done` | `untrack` | 🗑️ Stop versioning |
| `oops config` | - | ⚙️ Manage configuration |
| `oops gc` | - | 🧹 Clean up orphaned stores |

### Flags

| Flag | Description |
|------|-------------|
| `-g, --global` | Use global storage (`~/.oops/`) |
| `-l, --local` | Use local storage (`.oops/`) - overrides config |
| `-a, --all` | Show both local and global (for `files` command) |

## Examples

### Basic Workflow

```bash
oops start notes.md           # Snapshot #1 created
# ... write ...
oops save "brain dump"        # Snapshot #2
# ... edit ...
oops save "organized thoughts"  # Snapshot #3
```

### Oops! Moments

```bash
# Accidentally deleted important text?
oops oops!                    # Restores to last saved state

# Want to see an older version?
oops back 1                   # Go to snapshot #1
oops back 3                   # Jump back to snapshot #3
```

### See What Changed

```bash
oops changes                  # Unsaved changes vs last snapshot
oops changes 1                # Current vs snapshot #1
oops changes 1 3              # Compare snapshot #1 and #3
```

### Check Status

```bash
oops now
# 📄 File:     notes.md
# 📍 Snapshot: #3 (latest)
# ✏️  Status:   Modified
#
#   You have unsaved changes
#     oops save    Save your changes
#     oops oops!   Undo changes
```

## How It Works

Oops uses an embedded Git library (go-git) - no external Git installation needed.

### Local Storage (Default)

```
project/
├── notes.md
└── .oops/
    └── notes.md.git/    ← Version storage (hidden)
```

### Global Storage (`-g` flag)

Keep your project directory clean by storing versions in your home directory:

```bash
oops start -g notes.md    # Store in ~/.oops/
oops files -g             # List global tracked files
oops gc -g                # Clean orphaned global stores
```

```
~/.oops/
└── a1b2c3d4.../          ← Hash-based directory
    ├── metadata.txt      ← Original file path
    └── notes.md.git/     ← Version storage
```

### Configuration

Set global as default mode:

```bash
oops config --default-global   # Always use global storage
oops config --default-local    # Use local storage (default)
oops config                    # Show current settings
```

### Features

- Each snapshot = commit + tag (v1, v2, v3...)
- Delta compression for storage efficiency
- Works completely offline, no server needed
- `.oops/` automatically added to `.gitignore`
- Cross-platform path handling (Windows/Unix)

## Use Cases

**Perfect for:**
- 📝 Writers - essays, articles, manuscripts
- 📊 Researchers - notes, data files
- ⚙️ Config files - when you need quick rollback
- 📋 Any single file you edit frequently

**For multi-file projects:** Use Git directly

## Comparison

| Feature | Oops | Git |
|---------|------|-----|
| Learning curve | 5 minutes | Hours |
| Commands to learn | ~5 | ~20+ |
| Single file focus | ✓ | Multi-file |
| Server required | No | Optional |
| Storage efficiency | Git-level | Git |
| Undo mistakes | `oops oops!` | `git checkout HEAD -- file` |

## Why "Oops"?

Because everyone makes mistakes when editing files. With Oops, you can simply say "oops!" and go back to a safe state. No complex commands, no fear of losing work.

## License

MIT
