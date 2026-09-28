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
oops save essay.txt "first draft"      # 📸 Save a version (starts versioning the file)
# ... write something ...
oops save essay.txt "added conclusion" # 📸 Save another
oops history essay.txt                 # 📜 View all versions
oops changes essay.txt                 # 🔍 What changed since the last save?
oops back essay.txt 1                  # ⏪ Go back to version #1
oops oops! essay.txt                   # ↩️  Made a mistake? Back to the last save
```

Going back never loses work: if the file has changes that were not saved, oops keeps them as an
automatic version first, so you can return to them too.

## Commands

| Command | Also | Description |
|---------|------|-------------|
| `oops save <file> [message]` | `start`, `track`, `commit`, `snap` | 📸 Save a version (the first save starts versioning) |
| `oops history <file>` | `log`, `list` | 📜 List versions |
| `oops changes <file> [from] [to]` | `diff` | 🔍 Compare the file with the latest version, with `#from`, or `#from` with `#to` |
| `oops back <file> <version>` | `checkout`, `restore` | ⏪ Go back to a version |
| `oops oops! <file>` | `undo` | ↩️ Go back to the latest version |
| `oops cat <file> <version>` | | 📄 Print a version (`--out <path>` writes it to a file) |
| `oops now <file>` | `status` | ℹ️ Does the file match a saved version? |
| `oops files` | `ls` | 📁 List versioned files |
| `oops mv <from> <to>` | | 🚚 Move a file and keep its versions |
| `oops done <file>` | `untrack` | 🗑️ Stop versioning a file and delete its versions |
| `oops prune` | | 🧹 Remove old automatic versions |
| `oops gc` | | 🧹 Remove the versions of files that no longer exist |
| `oops config` | | ⚙️ Default storage mode |
| `oops update` | | 🔄 Update oops |

## Saved and Automatic Versions

A version is either **saved** (`manual`, the default) or **automatic** (`auto`):

```bash
oops save notes.md "before the big edit"   # saved - kept until you delete it
oops save notes.md --auto                  # automatic - may be removed by prune
```

Versions made by `back` to keep unsaved changes are automatic. `prune` only ever removes automatic
versions.

## Keeping the Store Small

```bash
oops prune --max-age 30d                  # automatic versions older than 30 days
oops prune --max-size 500MB               # keep the store under 500 MB
oops prune --max-age 30d --dry-run        # see what would go
oops gc                                   # versions of files that were deleted
```

With `--max-size`, oops removes the oldest automatic version of the file that has the most versions
first, and keeps each file's newest version until nothing else is left to remove. `prune` without
options removes nothing.

## Where Versions Live

| Mode | Location |
|------|----------|
| Local (default) | `.oops/` beside the file - added to an existing `.gitignore` |
| Global (`-g`) | `~/.oops/` |
| Any directory | `--store <dir>` or the `OOPS_STORE` environment variable |

`oops config --default-global` makes global the default; `-l` overrides it.

A store holds any number of files:

```
<store>/
└── files/
    └── <key>/            ← one directory per file (key = hash of its path)
        ├── index.json    ← versions: number, time, kind, label, actor, metadata
        └── blobs/        ← content, one file per distinct version (gzip when useful)
```

## For Scripts and Applications

Every command accepts `--json` and then prints exactly one JSON object on stdout, success or error.

```bash
oops --json save report.md "draft" --actor sync --meta batch=42
```
```json
{ "saved": true, "path": "/work/report.md",
  "version": { "n": 3, "hash": "…", "size": 1204, "time": "2026-01-01T09:00:00Z",
               "kind": "manual", "actor": "sync", "label": "draft", "meta": { "batch": "42" } } }
```

Saving content equal to the latest version succeeds without a new version:
`{"saved": false, "reason": "unchanged", …}`.

| Command | JSON |
|---------|------|
| `save` | `{saved, reason?, path, version}` |
| `history` | `{path, versions: [version…]}` — filter with `--kind manual\|auto` and `--where key=value` |
| `now` | `{path, exists, latest, current, changed}` — `current` is 0 when no version matches |
| `back`, `oops!` | `{path, restored, savedBefore: version\|null}` |
| `changes` | `{path, from, to\|null, binary, diff}` |
| `prune` | `{dryRun, removed: [{path, n, reason}], freedBytes, totalBytes, overCapBytes}` |
| `gc` | `{orphans, removed, dryRun}` |
| error | `{"error": {"code": "<code>", "message": "<text>"}}` |

**Exit codes**

| Code | Meaning | `error.code` |
|------|---------|--------------|
| 0 | success (including "unchanged") | |
| 1 | other failure | `error` |
| 2 | wrong arguments or flags | `usage` |
| 3 | the file is not versioned | `not_tracked` |
| 4 | no such version | `version_not_found` |
| 5 | another oops process kept the lock | `lock_timeout` |
| 6 | the file does not exist | `file_not_found` |
| 7 | the target already has versions (`mv`) | `already_tracked` |

- `--actor <text>` and `--meta key=value` (repeatable) are stored on the version as given.
- With `--json`, oops never asks a question: `done` and `gc` need `--yes`.
- Several oops processes may work on one store at once; each waits up to `--lock-timeout` (10s).
- An application that ships oops can set `OOPS_NO_UPDATE=1` so `oops update` refuses to replace it.

## Upgrading from 0.3

0.4 uses a new store format and does not read 0.3 stores (`.oops/<name>.git`). Restore anything you
need with oops 0.3 first. Commands now take the file: `oops save notes.md "message"` instead of
`oops save "message"`, and one folder can hold any number of versioned files.

## Use Cases

- 📝 Writers - essays, articles, manuscripts
- 📊 Researchers - notes, data files
- ⚙️ Config files - when you need quick rollback
- 🤖 Tools that change files for you - save an automatic version first, go back if the change was wrong

**For software projects:** use Git.

## Why "Oops"?

Because everyone makes mistakes when editing files. With Oops, you can simply say "oops!" and go back
to a safe state. No complex commands, no fear of losing work.

## License

MIT
