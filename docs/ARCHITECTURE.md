# Oops Architecture Reference

## Design Philosophy

Oops provides Git-style single file versioning with simple linear progression and familiar commands. It bridges the gap between basic file editing and powerful version control.

### Core Principles

- **Familiar Commands**: Git syntax users already know (track, commit, checkout, diff, log)
- **Single File Focus**: Eliminates multi-file coordination complexity
- **Simple Versioning**: Linear progression (1→2→3→4) without complex branching
- **Hidden Infrastructure**: Git repositories managed transparently
- **Standard Output**: Git-compatible formats for tool integration
- **Local First**: No network dependencies, works offline

---

## System Architecture

```
┌─────────────────────────────────────┐
│         CLI Interface               │  Git-compatible commands
├─────────────────────────────────────┤
│      Auto-Versioning Engine        │  Smart version generation
├─────────────────────────────────────┤
│       Command Processors           │  Business logic per command
├─────────────────────────────────────┤
│     History & Navigation           │  Timeline management
├─────────────────────────────────────┤
│      Hidden Git Layer              │  Invisible repositories
├─────────────────────────────────────┤
│        File System                 │  Cross-platform storage
└─────────────────────────────────────┘
```

---

## Core Components

### 1. CLI Interface
- **Purpose**: Git-compatible command processing
- **Design**: Zero external dependencies, direct argument parsing
- **Output**: Standard Git output formats with familiar messaging
- **Error Handling**: Git-style error messages with helpful suggestions

### 2. Simple Version System
- **Linear Progression**: Sequential numbering (1→2→3→4)
- **No Complex Branching**: Simplified workflow for single file editing
- **Change Tracking**: Git-powered diff and history management
- **Standard Output**: Git-compatible log and diff formats

### 3. Command Processors
Each command has dedicated logic:
- **Validation**: Pre-flight checks and safety validations
- **Execution**: Core functionality with atomic operations
- **Feedback**: Clear success/failure messages with next steps

### 4. History Management
- **Navigation**: Maintains current position and forward/backward paths
- **Timeline**: Tracks parent-child relationships between versions
- **Metadata**: Stores timestamps, descriptions, and change statistics

### 5. Hidden Git Layer
- **Repository Per File**: Each versioned file gets isolated Git repo
- **Invisible Storage**: Repositories stored in user data directory
- **Git Commands**: Minimal set of operations (init, add, commit, tag, checkout)
- **Abstraction**: Users never interact with Git directly

---

## Data Flow

### Version Creation Process
```
User Edit → Change Detection → Version Generation → Git Commit → Update Timeline
```

### Navigation Process
```
User Command → Validate Target → Git Checkout → Update File → Show Status
```

### Simple Navigation Logic
```
Current: Version 3 → Checkout Version 1 → Edit & Commit → Creates Version 4
```

---

## File System Design

### Storage Structure
```
.oops/                         # Workspace directory
├── config.json               # Workspace configuration
├── state.json                # Tracking state
└── files/                    # Per-file version storage
    └── <file-hash>/          # Isolated file versioning
        ├── .git/             # Git repository for this file
        ├── backup            # Original file backup
        └── metadata.json     # File versioning metadata
```

### Benefits
- **No Workspace Pollution**: Original directories stay clean
- **Cross-Platform**: Works on Windows, macOS, Linux
- **Isolated Files**: Each file has independent version history
- **Easy Cleanup**: Delete directory to remove all history

---

## Version Numbering System

### Simple Sequential Versioning
- **Pattern**: Sequential integers (1, 2, 3, 4, 5...)
- **Increment**: Each commit creates next number
- **Start**: Every file begins at version 1
- **Navigation**: Can checkout any version and continue from there

### Linear Progression Benefits
- **Simplicity**: Easy to understand and remember
- **Predictability**: Always know what the next version will be
- **No Conflicts**: Single file eliminates merge complexity
- **Clear History**: Straightforward timeline of changes

---

## Git Integration Strategy

### Hidden Repositories
- **Location**: User data directory, not project directories
- **Per-File**: One Git repo per versioned file
- **Operations**: Only essential Git commands used
- **Abstraction**: Complete isolation from user

### Git Command Mapping
- `oops commit` → `git add` + `git commit` + `git tag`
- `oops checkout` → `git checkout <version>`
- `oops diff` → `git diff` (output format preserved)
- `oops log` → `git log --oneline --graph` (standard Git format)

### Benefits of Git Foundation
- **Reliability**: Battle-tested storage engine
- **Efficiency**: Delta compression, fast operations
- **Atomic**: All-or-nothing operations prevent corruption
- **Portable**: Standard Git repositories (exportable if needed)
- **Tool Compatibility**: Standard Git output works with existing tools

---

## Version Management Intelligence

### Change Detection
- **Git-Powered**: Leverages Git's robust diff algorithms
- **Content Analysis**: Line-by-line comparison and change tracking
- **Atomic Operations**: All-or-nothing commits for data safety
- **Hash Validation**: Content integrity verification

### Simple Version Logic
- **Linear Progression**: Always increments to next sequential number
- **Position Tracking**: Knows current version and can navigate to any point
- **No Merging**: Single file workflow eliminates merge conflicts
- **Recovery**: Git's reliability provides automatic recovery

---

## Safety & Reliability

### Atomic Operations
- **Principle**: All changes succeed completely or fail completely
- **Implementation**: Transaction-style file operations
- **Rollback**: Automatic cleanup on operation failure
- **Integrity**: Consistent state guaranteed

### Error Recovery
- **Detection**: Automatic validation of Git repositories and metadata
- **Self-Healing**: Rebuild corrupted timelines from Git history
- **Graceful Degradation**: Partial functionality during problems
- **User Guidance**: Clear recovery instructions for manual intervention

### Data Protection
- **Local Only**: No network operations, no remote storage
- **User Permissions**: Operates within normal file system permissions
- **No Sensitive Data**: Only stores file content and metadata
- **Transparent**: All operations can be audited

---

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Load version data on demand
- **Efficient Diffing**: Stream processing for large files
- **Minimal Git Operations**: Only necessary commands executed
- **Caching**: Metadata cached between operations

### Scalability Limits
- **File Size**: Optimized for files up to 10MB
- **Version Count**: Efficient up to 1000 versions per file
- **Response Time**: Sub-second operations for typical usage
- **Concurrent Files**: No practical limit (each file independent)

---

## Configuration & Customization

### Zero-Config Philosophy
- **Default Behavior**: Works immediately without configuration
- **Smart Defaults**: Reasonable choices for most users
- **Optional Config**: Advanced users can customize behavior
- **Environment Variables**: Simple overrides for common preferences

### Extensibility Points
- **Diff Tools**: Integration with external diff viewers
- **Editors**: Editor-specific integration hooks
- **Output Format**: Customizable display options
- **Cleanup Policies**: Configurable retention and cleanup rules

---

## Testing Strategy

### Unit Testing
- Command processors with mocked dependencies
- Version generation algorithms
- Timeline rendering and navigation logic
- Change analysis and description generation

### Integration Testing
- End-to-end command workflows
- Git repository operations
- Cross-platform file system handling
- Error scenarios and recovery

### User Experience Testing
- Command discoverability and intuitiveness
- Error message clarity and helpfulness
- Performance with various file sizes
- Visual timeline readability and usefulness

---

## Future Considerations

### Enhancement Opportunities
- **Editor Integration**: Plugins for popular editors
- **Tool Integration**: External diff viewers and Git tool compatibility
- **Export Features**: Standard Git repository export
- **Performance**: Optimization for large files and many versions

### Architectural Constraints
- **Single File Focus**: Intentionally limited to individual file versioning
- **Local Only**: No remote synchronization (may add in future)
- **Simple Workflow**: Linear progression only, no complex branching
- **Git Foundation**: Uses Git as reliable storage engine

---

## Implementation Guidelines

### Command Design
- Use Git-compatible verbs (track, commit, checkout, diff, log)
- Simple linear version progression (1→2→3→4)
- Clear output with familiar Git messaging
- Safe operations with atomic commits

### Output Design
- **Git Format Compatibility**: Standard Git diff and log formats
- **Tool Integration**: Works with existing Git-aware tools
- **Consistent Experience**: Familiar output for Git users
- **Pipeable Output**: Compatible with Git tool ecosystem

### Storage Design
- Isolated per-file Git repositories
- Workspace-based organization
- Cross-platform compatibility
- Reliable Git-based storage engine

This architecture provides powerful single-file versioning using familiar Git commands with simplified linear workflow.