# Oops Architecture Reference

## Design Philosophy

Oops bridges the gap between simple file editing and powerful version control by hiding Git's complexity behind intuitive commands and automatic versioning.

### Core Principles

- **Zero Learning Curve**: Git's familiar commands without Git's complexity
- **Single File Focus**: Eliminates multi-file coordination complexity
- **Invisible Infrastructure**: Users never see Git repositories or technical details
- **Auto-Everything**: Smart defaults eliminate decisions
- **Git Compatibility**: Standard Git log output you already know
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

### 2. Auto-Versioning Engine
- **Version Generation**: Automatic numbering (1.0 → 1.1 → 1.2)
- **Branch Detection**: Creates branches when editing after navigation
- **Change Analysis**: Generates smart descriptions of modifications
- **Git Integration**: Uses standard Git formats for output compatibility

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

### Auto-Branching Logic
```
Current: 1.3 → Back to 1.1 → Edit & Save → Creates 1.1.1 (branch)
```

---

## File System Design

### Storage Structure
```
~/.oops/
├── files/
│   ├── config-txt-hash123/
│   │   ├── .git/              # Hidden Git repository
│   │   ├── metadata.json      # Version timeline and navigation
│   │   └── current.txt         # Working copy
│   └── script-py-hash456/
└── global.json                # User preferences
```

### Benefits
- **No Workspace Pollution**: Original directories stay clean
- **Cross-Platform**: Works on Windows, macOS, Linux
- **Isolated Files**: Each file has independent version history
- **Easy Cleanup**: Delete directory to remove all history

---

## Version Numbering System

### Sequential Versioning
- **Pattern**: Major.Minor (1.0, 1.1, 1.2, 1.3)
- **Increment**: Always increases minor version
- **Start**: Every file begins at 1.0

### Branch Versioning
- **Pattern**: Major.Minor.Patch (1.2.1, 1.2.2, 1.2.3)
- **Trigger**: Edit after navigating backward
- **Logic**: Branch from the current position

### Complex Branching
- **Pattern**: Major.Minor.Patch.Sub (1.1.1.1, 1.1.1.2)
- **Use Case**: Branches from existing branches
- **Depth**: Theoretically unlimited, practically limited

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

## Auto-Versioning Intelligence

### Change Detection
- **File Monitoring**: Hash-based change detection
- **Diff Analysis**: Line-by-line comparison
- **Smart Descriptions**: Pattern recognition for common changes
- **Section Detection**: Identifies modified code/content sections

### Version Generation
- **Context Aware**: Knows current position in timeline
- **Branch Logic**: Automatic branch creation when appropriate
- **Conflict Prevention**: Single file eliminates merge conflicts
- **Recovery**: Self-healing for corrupted timelines

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
- **Advanced Navigation**: Fuzzy search, date-based navigation
- **Export Features**: Git repository export, format conversion
- **Tool Integration**: Enhanced Git tool compatibility and delegation

### Architectural Constraints
- **Single File Focus**: Intentionally limited scope
- **Local Only**: No remote synchronization
- **No Plugins**: Simple, focused feature set
- **Git Dependency**: Requires Git installation

---

## Implementation Guidelines

### Command Design
- Use Git-compatible verbs (commit, checkout, log, diff)
- Provide smart defaults with Git-style behavior
- Show helpful next steps with familiar Git messaging
- Handle errors gracefully with Git-style error messages

### Output Design
- **Git Format Compatibility**: Use standard Git output formats
- **Tool Integration**: Delegate to Git tools when appropriate
- **Consistent Experience**: Familiar format for Git users
- **Pipeable Output**: Works with existing Git-aware tools

### Storage Design
- Isolated per-file repositories
- Predictable directory structure
- Cross-platform path handling
- Automatic cleanup strategies

This architecture balances simplicity for users with powerful functionality, using Git's proven reliability while hiding its complexity completely.