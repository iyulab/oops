# Oops - Git-Style Single File Versioning

**Familiar Git commands, simplified for single files.**

Transform any text file into a versioned document with Git-style commands and simple linear progression. Perfect for developers who want Git's power for individual files.

## Why Oops?

**For Developers**: Use familiar Git commands on single files without repository setup

**For Config Management**: Version system files safely with track→edit→commit workflow

**For Scripts**: Experiment with code changes using checkout and commit

**For Documentation**: Maintain version history of important files with simple numbering

## Quick Start

```bash
# Install
npm install -g @iyulab/oops-cli

# Start versioning any file
oops track config.txt

# Edit with any editor you want
vim config.txt

# Save a checkpoint  
oops commit "updated settings"

# See what changed
oops diff

# Go back if needed
oops checkout 1
```

That's it. No setup, no repositories, no complexity.

## Core Concept

Oops gives you **Git-style versioning** for single files with simple progression:

- **1** - Your starting point (initial version)
- **2** - First commit
- **3** - Second commit  
- **4** - Continue linearly

Navigate through versions with familiar Git commands. Simple numbering, powerful functionality.

## Essential Commands

```bash
oops track <file> # Start versioning (creates version 1)
oops commit       # Create next version (2, 3, 4...)
oops diff         # See changes
oops checkout     # Navigate versions
oops log          # See timeline

# End tracking
oops untrack      # Stop tracking (keep current state)
oops keep         # Same as untrack
oops undo         # Restore version and stop tracking
```

Eight Git-style commands. Complete lifecycle management. Familiar syntax.

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
oops track article.md    # Start versioning (version 1)
# ... write and edit ...
oops commit "first draft" # Version 2
# ... more editing ...
oops commit "revisions"   # Version 3
oops checkout 2          # Back to version 2 if needed
```

### Experimental Changes
```bash
# At version 3, want to try something different
oops checkout 1    # Go to version 1
# ... experimental edits ...
oops commit        # Creates version 4 (continues linearly)
oops log           # See the timeline
```

### Quick Recovery
```bash
oops log           # See all versions
oops checkout 1    # Go to specific version
oops diff 1        # Compare with original
oops undo file.txt 1  # Restore to version 1 and stop tracking
```

### Complete Workflow
```bash
oops track config.txt   # Start tracking (version 1 created)
# ... edit file ...
oops commit "updated"   # Save as version 2
oops checkout 1         # Go back to test
# ... edit file ...
oops commit "alternate" # Creates version 3
oops log                # See full history
oops keep config.txt    # Finished - stop tracking
```

## Key Benefits

- **Familiar Commands**: Git syntax you already know (track, commit, checkout, diff, log)
- **Simple Versioning**: Linear progression (1→2→3→4) without complex branching
- **Git Compatible**: Standard Git output formats work with existing tools
- **Safe Experimentation**: Navigate history and commit changes safely
- **Editor Agnostic**: Works with vim, VS Code, or any text editor
- **Local Only**: Your files stay on your computer

## Installation & Getting Started

```bash
# Install globally
npm install -g @iyulab/oops-cli

# Start with any text file
oops track myfile.txt

# Follow the friendly prompts
# Edit, save, navigate - that's it!
```

## Design Philosophy

**Git Familiarity**: Use commands developers already know (track, commit, checkout)

**Linear Simplicity**: Sequential numbering (1→2→3→4) without complex branching

**Standard Output**: Git-compatible diff and log formats

**Single File Focus**: No multi-file coordination headaches

**Developer Friendly**: Familiar workflow with simplified version management

---

**Perfect for**: Configuration files, scripts, documentation, creative writing, research notes, any text that evolves over time.

**Not for**: Multi-file projects (use Git), binary files, team collaboration (use proper version control).

Ready to version your files? `npm install -g @iyulab/oops-cli` and start with `oops track yourfile.txt`.