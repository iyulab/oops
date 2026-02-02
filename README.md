# Oops - Git-Style Single File Versioning

**Familiar Git commands, simplified for single files.**

A single binary with zero dependencies. No Git, no Node.js, no runtime required.

## Installation

```bash
go install github.com/iyulab/oops@latest
```

Or download from [GitHub Releases](https://github.com/iyulab/oops/releases).

## Quick Start

```bash
oops track config.txt       # Start versioning
vim config.txt              # Edit with any editor
oops commit "updated"       # Save checkpoint
oops diff                   # See changes
oops checkout 1             # Go back if needed
```

## Commands

| Command | Description |
|---------|-------------|
| `oops track <file>` | Start versioning (creates version 1) |
| `oops commit [message]` | Create next version |
| `oops checkout <version>` | Navigate to version (`-f` to force) |
| `oops diff [version]` | Show changes |
| `oops log` | Show version history |
| `oops status` | Show current state |
| `oops list` | List tracked files |
| `oops untrack` | Stop tracking |

## Examples

### Basic Workflow

```bash
oops track notes.md       # Version 1
# ... edit ...
oops commit "first draft" # Version 2
# ... edit ...
oops commit "revisions"   # Version 3
```

### Compare Versions

```bash
oops diff          # Working file vs current version
oops diff 1        # Working file vs version 1
oops diff 1 3      # Version 1 vs version 3
```

### Navigation

```bash
oops log           # See all versions
oops checkout 2    # Jump to version 2
oops checkout -f 1 # Force checkout (discard uncommitted changes)
```

### Branching from Past

```bash
# At version 10, go back to version 2
oops checkout 2
# ... edit ...
oops commit "new direction"  # Creates version 11 (from v2)
```

All versions preserved. No data loss.

## How It Works

Versions stored in `.oops/` alongside your file:

```
project/
├── config.txt
└── .oops/
    └── {hash}/
        ├── meta.json
        └── versions/
            ├── 1
            ├── 2
            └── 3
```

Automatically added to `.gitignore` if present.

## Use Cases

**Good for**: Config files, scripts, documentation, notes

**Not for**: Multi-file projects, binary files, team collaboration → use Git

## License

MIT