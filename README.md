# Oops - Simple File Versioning for Everyone

**One command away from fearless editing.**

Transform any text file into a versioned document with automatic snapshots, visual history, and effortless navigation. No Git knowledge required.

## Why Oops?

**For Writers**: Save drafts without cluttering folders with "document_v1", "document_final", "document_final_REAL"

**For Developers**: Quick config changes without setting up repositories

**For Students**: Track essay revisions without losing good paragraphs

**For Everyone**: Edit confidently knowing you can always go back

## Quick Start

```bash
# Install
npm install -g @iyulab/oops-cli

# Start versioning any file
oops config.txt

# Edit with any editor you want
vim config.txt

# Save a checkpoint  
oops commit

# See what changed
oops diff

# Go back if needed
oops checkout 1.1
```

That's it. No setup, no repositories, no complexity.

## Core Concept

Oops gives you **automatic versioning** for single files:

- **1.0** - Your starting point
- **1.1** - First save
- **1.2** - Second save
- **1.2.1** - Branch when you go back and edit

Navigate through versions like pages in a book. See your editing timeline visually. Never lose work again.

## Essential Commands

```bash
oops <file>      # Start versioning (creates 1.0)
oops commit      # Create checkpoint
oops diff        # See changes
oops checkout    # Navigate versions
oops log         # See timeline

# End tracking
oops untrack     # Stop tracking (keep current state)
oops keep        # Same as untrack
oops undo        # Restore version and stop tracking
```

Eight commands. Complete lifecycle management. Git-compatible and intuitive.

## What Makes It Different

**Traditional approach:**
- Save multiple files: `doc_v1.txt`, `doc_v2.txt`, `doc_final.txt`
- Manual backup management
- Lost track of what changed when

**With Oops:**
- One file: `document.txt`
- Automatic version snapshots
- Visual timeline of all changes
- Instant navigation between versions

## Simple Examples

### Basic Editing
```bash
oops article.md    # Start versioning
# ... write and edit ...
oops commit        # Checkpoint: 1.1
# ... more editing ...
oops commit        # Checkpoint: 1.2
oops checkout 1.1  # Back to 1.1 if needed
```

### Experimental Changes
```bash
# At version 1.3, want to try something different
oops checkout 1.1  # Go to 1.1
# ... experimental edits ...
oops commit        # Creates 1.1.1 (branch)
oops log           # See the split timeline
```

### Quick Recovery
```bash
oops log           # See all versions
oops checkout 1.0  # Go to specific version
oops diff 1.0      # Compare with original
oops undo file.txt 1.0  # Restore to version 1.0 and stop tracking
```

### Complete Workflow
```bash
oops config.txt    # Start tracking (1.0 created)
# ... edit file ...
oops commit        # Save as 1.1
oops checkout 1.0  # Go back to test
# ... edit file ...
oops commit        # Creates branch 1.0.1
oops log           # See full history
oops keep config.txt  # Finished - stop tracking
```

## Key Benefits

- **Zero Learning Curve**: If you can edit a file, you can use Oops
- **No Setup**: Works immediately on any text file
- **Git Compatible**: Uses familiar Git commands and standard output formats
- **Safe Experimentation**: Try changes without fear
- **Universal**: Works with any editor, any workflow
- **Local Only**: Your files stay on your computer

## Installation & Getting Started

```bash
# Install globally
npm install -g @iyulab/oops-cli

# Start with any text file
oops myfile.txt

# Follow the friendly prompts
# Edit, save, navigate - that's it!
```

## Design Philosophy

**Simplicity First**: Git's power without Git's complexity

**Zero Friction**: No commit messages, no setup, no decisions to make

**Visual Navigation**: See your edit history like a map

**Single File Focus**: No multi-file coordination headaches

**Universal Access**: Designed for non-developers but powerful enough for experts

---

**Perfect for**: Configuration files, scripts, documentation, creative writing, research notes, any text that evolves over time.

**Not for**: Multi-file projects (use Git), binary files, team collaboration (use proper version control).

Ready to edit without fear? `npm install -g @iyulab/oops-cli` and start with `oops yourfile.txt`.