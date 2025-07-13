---

## 옵션 및 플래그

| 옵션 | 적용 명령어 | 기능 |
|------|-------------|------|
| `--quiet` | 모든 명령어 | 최소한의 출력 |
| `--help` | 모든 명령어 | 도움말 표시 |
| `--no-color` | `diff`, `log` | 색상 비활성화 |
| `--tool <tool>` | `diff` | 외부 diff 도구 사용 |
| `--graph` | `log` | 그래프 형태로 히스토리 표시 |
| `--oneline` | `log` | 한 줄로 간략히 표시 |# Oops Commands Reference

## Command Overview

Oops provides **8 essential commands** using familiar Git syntax for complete file versioning lifecycle. If you know Git, you already know Oops.

## 핵심 명령어

| 명령어 | 축약형 | 기능 | 설명 | Git 유사 명령어 |
|--------|--------|------|------|----------------|
| `oops track <file>` | `oops <file>` | 추적 시작 | 파일 버전 관리 시작, 1.0 생성 | `git init` + `git add` |
| `oops commit [msg]` | - | 버전 생성 | 현재 상태를 새 버전으로 저장 | `git commit` |
| `oops checkout <ver>` | - | 버전 이동 | 특정 버전으로 파일 상태 변경 | `git checkout` |
| `oops diff [ver]` | - | 변경사항 비교 | 현재와 특정 버전 간 차이 표시 | `git diff` |
| `oops log` | - | 히스토리 보기 | 모든 버전의 시간순 목록 표시 | `git log` |

## 종료 명령어

| 명령어 | 기능 | 동작 | 파일 상태 | .git 폴더 |
|--------|------|------|-----------|----------|
| `oops untrack <file>` | 추적 중단 | 현재 상태 유지하며 추적 종료 | 현재 상태 유지 | 삭제 |
| `oops keep <file>` | 추적 중단 | untrack과 동일 (별칭) | 현재 상태 유지 | 삭제 |
| `oops undo <file>` | 되돌리고 종료 | 최근 커밋으로 복원 후 추적 종료 | 최근 커밋 상태 | 삭제 |
| `oops undo <file> <ver>` | 특정 버전 복원 | 지정 버전으로 복원 후 추적 종료 | 지정 버전 상태 | 삭제 |

---

## Core Commands

### `oops track <file>` (축약: `oops <file>`)
**Start versioning a file**

```bash
oops track config.txt
oops config.txt          # Short form
oops script.py
```

**Behavior:**
- Creates version 1.0 if file not yet versioned
- Shows current status if already versioning
- Sets up invisible versioning infrastructure
- Works with any text file

**Git Comparison:**
```bash
# Git                    # Oops
git init && git add file  oops track file
```

**First time:** Creates 1.0 and shows getting started tips
**Already versioned:** Shows current version and change status

---

### `oops commit [message]`
**Create a new version checkpoint**

```bash
oops commit
oops commit "added database config"
```

**Git Comparison:**
```bash
# Git                    # Oops
git commit -m "msg"      oops commit "msg"
git add . && git commit  oops commit
```

**Versioning Logic:**
- **Sequential**: 1.0 → 1.1 → 1.2 → 1.3
- **Branching**: If you go back to 1.1 and edit → creates 1.1.1, 1.1.2, etc.
- **Auto-description**: Analyzes changes if no message provided
- **Smart incrementing**: Handles complex branching automatically

**Requirements:** File must have changes since last version

---

### `oops diff [version]`
**Show what changed**

```bash
oops diff           # Compare with previous version
oops diff 1.1       # Compare current with specific version
oops diff --tool code        # Open in VS Code
oops diff | less             # Pipe to pager like Git
```

**Git Comparison:**
```bash
# Git                    # Oops
git diff HEAD~1        oops diff
git diff v1.1          oops diff 1.1
git diff --tool=code   oops diff --tool code
```

**Display:**
- Standard Git diff format (compatible with existing tools)
- Familiar `---`/`+++` headers and `@@` hunks
- Standard color coding (red for removed, green for added)
- Works with external diff tools and Git-aware editors

---

### `oops checkout <version>`
**Navigate to any version in history**

```bash
oops checkout 1.1   # Go to specific version
oops checkout 1.2.1 # Go to branch version
oops checkout HEAD  # Go to latest version
```

**Git Comparison:**
```bash
# Git                    # Oops
git checkout main       oops checkout HEAD
git checkout v1.2       oops checkout 1.2
git checkout <commit>   oops checkout 1.1
```

**Behavior:**
- Updates file content immediately
- Shows where you moved to
- Standard Git checkout semantics

**Note:** After checkout, you can edit and commit to create a branch

---

### `oops log`
**Show visual version timeline**

```bash
oops log
oops log --oneline
oops log --graph
```

**Git Comparison:**
```bash
# Git                    # Oops
git log --oneline       oops log
git log --graph         oops log --graph
git log --decorate      oops log
```

**Display:**
- Standard Git log format with commit hashes and tags
- Familiar timeline layout that Git users recognize
- Compatible with Git visualization tools
- Standard `git log --oneline --graph` style output
- Shows version tags as Git tags

**Example Output:**
```
* 1.2.1 (HEAD, tag: 1.2.1) Alternative approach
| * 1.3 (tag: 1.3) Final cleanup  
| * 1.2 (tag: 1.2) Added SSL config
|/  
* 1.1 (tag: 1.1) Database settings
* 1.0 (tag: 1.0) Initial version
```

---

## Auto-Versioning System

### Version Number Format

**Sequential Progression:**
```
1.0 → 1.1 → 1.2 → 1.3 → 1.4
```

**Branching from Earlier Versions:**
```
1.2 → 1.3
  ↳ 1.2.1 → 1.2.2 → 1.2.3
```

**Complex Branching:**
```
1.0 → 1.1 → 1.2 → 1.3
          ↳ 1.1.1 → 1.1.2
                 ↳ 1.1.1.1
```

### Smart Description Generation

Oops automatically analyzes your changes:
- "Added 15 lines"
- "Modified database section"  
- "Removed debug code, added error handling"
- "Major refactoring (45 lines changed)"

You can always add your own note: `oops save "fixed SSL configuration"`

---

### 종료 명령어들

#### `oops untrack <file>`
**Stop tracking file (keep current state)**

```bash
oops untrack config.txt
```

**Behavior:**
- Stops version tracking
- Keeps file in current state
- Removes all version history
- File remains unchanged

#### `oops keep <file>`
**Alias for untrack**

```bash
oops keep config.txt    # Same as untrack
```

#### `oops undo <file> [version]`
**Restore and stop tracking**

```bash
oops undo config.txt       # Restore to latest commit
oops undo config.txt 1.2   # Restore to specific version
```

**Behavior:**
- Restores file to specified version (or latest)
- Stops version tracking
- Removes all version history
- File content changes to restored version

---

## 전체 워크플로우 예시

| 단계 | 명령어 | 결과 | 버전 |
|------|--------|------|------|
| 1 | `oops config.txt` | 추적 시작 | 1.0 |
| 2 | 파일 편집 | - | - |
| 3 | `oops commit` | 새 버전 생성 | 1.1 |
| 4 | 파일 편집 | - | - |
| 5 | `oops commit "SSL added"` | 메시지와 함께 버전 생성 | 1.2 |
| 6 | `oops checkout 1.1` | 이전 버전으로 이동 | 1.1 |
| 7 | 파일 편집 | - | - |
| 8 | `oops commit` | 브랜치 버전 생성 | 1.1.1 |
| 9 | `oops log` | 전체 히스토리 확인 | - |
| 10 | `oops keep config.txt` | 작업 완료, 추적 종료 | 현재 상태 유지 |

## Common Workflows

### Linear Editing
```bash
oops document.txt    # 1.0
# edit...
oops commit         # 1.1
# edit...  
oops commit         # 1.2
```

### Experimental Branching
```bash
# Currently at 1.3
oops checkout 1.1   # Go to 1.1
# try different approach...
oops commit         # Creates 1.1.1
# continue experiment...
oops commit         # Creates 1.1.2
```

### Navigation and Comparison
```bash
oops log            # See timeline
oops checkout 1.1   # Go to specific version
oops diff 1.0       # Compare with original
oops checkout HEAD  # Go to latest
```

### Quick Recovery
```bash
oops log            # What happened?
oops checkout 1.2   # Go to known good state
oops commit         # Branch from here
```

### Git Tool Integration

Oops outputs use standard Git formats for maximum compatibility:

**Diff Output**: Standard `git diff` format
- Works with `diff` tools, syntax highlighters
- Compatible with IDE diff viewers
- Pipeable to Git-aware tools

**History Output**: Standard `git log` format  
- Compatible with Git visualization tools
- Works with existing Git aliases and scripts
- Standard commit hash and tag references

**External Tool Support**:
- `--tool` option delegates to Git's difftool
- Respects Git's tool configuration
- Works with any Git-compatible diff viewer

---

## 버전 번호 체계

| 상황 | 버전 형태 | 예시 |
|------|-----------|------|
| 순차적 진행 | Major.Minor | 1.0 → 1.1 → 1.2 → 1.3 |
| 브랜치 생성 | Major.Minor.Patch | 1.2 → 1.2.1 → 1.2.2 |
| 중첩 브랜치 | Major.Minor.Patch.Sub | 1.2.1 → 1.2.1.1 |

## 상태별 가능한 명령어

| 현재 상태 | 가능한 명령어 | 불가능한 명령어 |
|-----------|---------------|----------------|
| 추적 안함 | `track`, `<file>` | 나머지 모든 명령어 |
| 추적 중 (변경사항 없음) | `checkout`, `log`, `untrack`, `keep`, `undo` | `commit` (변경사항 없음) |
| 추적 중 (변경사항 있음) | 모든 명령어 | 없음 |
| 과거 버전 위치 | `commit` (브랜치 생성), `checkout`, `log`, 종료 명령어들 | 없음 |

## Error Prevention

### Smart Validations
- Can't commit without changes
- Can't checkout non-existent versions
- Clear error messages with helpful suggestions
- Standard Git-style error messages

### 에러 상황별 대응

| 에러 상황 | 명령어 | 결과 |
|-----------|--------|------|
| 파일이 존재하지 않음 | `oops track missing.txt` | 에러 메시지 + 파일 생성 안내 |
| 이미 추적 중 | `oops track config.txt` | 현재 상태 표시 |
| 변경사항 없음 | `oops commit` | 에러 메시지 + 편집 안내 |
| 잘못된 버전 번호 | `oops checkout 999.999` | 에러 메시지 + 가능한 버전 목록 |
| 손상된 .git 폴더 | 모든 명령어 | 자동 복구 시도 또는 재시작 안내 |

### Safety Features
- File existence validation
- Permission checking
- Atomic operations (never lose data)
- Self-healing if corruption detected

---

## Integration Notes

### Works With Any Editor
- vim, nano, emacs
- VS Code, Sublime Text
- Word processors that save plain text
- Any tool that edits text files

### File System Integration
- No special file formats
- Your files remain normal text files
- Versioning data stored separately
- No clutter in your project directories

---

## Command Design Principles

1. **Git Compatibility**: Commands match Git for zero learning curve
2. **Smart Defaults**: Minimal required arguments
3. **Helpful Output**: Every command provides clear next steps
4. **Error Recovery**: Mistakes are easy to undo
5. **Visual Feedback**: See your progress and position clearly

The goal is to make versioning so simple that you use it automatically, without thinking about it.