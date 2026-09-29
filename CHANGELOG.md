# Changelog

## 0.4.0

### Breaking
- New store format: plain content files and a JSON index per file, instead of one Git repository per
  file. 0.3 stores (`.oops/<name>.git`) are not read.
- Every command takes the file it acts on (`oops save notes.md "message"`, `oops back notes.md 2`).

### Added
- Any number of versioned files per folder or store.
- `--json` on every command, and documented exit codes.
- `--store <dir>` / `OOPS_STORE` to keep versions anywhere.
- Saved vs automatic versions (`--auto`), `--actor`, and `--meta key=value` with `history --where`.
- `prune --max-age / --max-size / --dry-run`; saved versions and each file's newest version are never removed by age.
- `cat` (print or write a version), `mv` (move a file with its versions).
- `back` keeps unsaved changes as a saved version before going back (never removed by `prune`).
- A local store records files relative to its folder: renaming or moving the folder keeps its versions.
- Safe concurrent use of one store (per-file lock, `--lock-timeout`).
- `OOPS_NO_UPDATE` makes `oops update` refuse to replace a bundled binary.

### Fixed
- Failures exited with code 0.
- Two versioned files in one folder made `save`, `back`, `history` and `now` unusable.
- Long UTF-8 text is no longer shown as binary in `changes`.
- Text in a legacy encoding (CP949, Shift-JIS, Latin-1) is no longer shown as binary: like git, only a NUL byte makes a file binary.
- A version list left empty (an interrupted write, a hand edit) reads as "not versioned yet" instead of crashing `back` and `changes`.
- `files` and `prune` report a history whose index cannot be read, instead of skipping it silently.
- `prune` reports only the removals it applied; a prune stopped by a lock timeout no longer overstates them.
- Size pruning no longer removes an automatic version whose content a saved version also keeps (it freed nothing).
- Removing a history deletes its index before its content, so another process never reads an index whose content is gone.
- The index is flushed to disk before it replaces the old one.
- On Windows, `mv r.txt R.txt` renames the file and keeps its versions (both names share one history).
- `--version --json` prints `{"version": …}`.

### Removed
- The go-git dependency (the Windows binary is about 30% smaller).
