package store

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// RestoreResult reports a restore. SavedBefore is the version that kept the
// file's unsaved content, nil when there was nothing to keep.
type RestoreResult struct {
	Path        string   `json:"path"`
	Restored    int      `json:"restored"`
	SavedBefore *Version `json:"savedBefore"`
}

// Restore writes version n back to the file. Content on disk that matches no
// version is first kept as a saved (manual) version, so a restore never loses work
// and prune never removes that copy.
func (s *Store) Restore(file string, n int, o SaveOptions) (RestoreResult, error) {
	abs, err := absPath(file)
	if err != nil {
		return RestoreResult{}, err
	}
	if _, err := s.index(abs); err != nil { // before locking: a lock would create the directory
		return RestoreResult{}, err
	}
	dir := s.fileDir(abs)
	unlock, err := lockFile(dir, s.LockTimeout)
	if err != nil {
		return RestoreResult{}, err
	}
	defer unlock()
	ix, err := s.index(abs)
	if err != nil {
		return RestoreResult{}, err
	}
	v := ix.Find(n)
	if v == nil {
		return RestoreResult{}, errf(CodeVersionNotFound, "version #%d not found for %s", n, abs)
	}
	target := *v
	res := RestoreResult{Path: ix.Path, Restored: n}
	cur, err := os.ReadFile(abs)
	switch {
	case err == nil:
		h := HashBytes(cur)
		if h == target.Hash {
			return res, nil
		}
		if !ix.HasHash(h) {
			o.Kind = KindManual
			if o.Label == "" {
				o.Label = fmt.Sprintf("before restore to #%d", n)
			}
			r, err := s.saveLocked(abs, dir, cur, o)
			if err != nil {
				return RestoreResult{}, err
			}
			res.SavedBefore = &r.Version
		}
	case !errors.Is(err, os.ErrNotExist):
		return RestoreResult{}, err
	}
	data, err := getBlob(dir, target.Hash)
	if err != nil {
		return RestoreResult{}, err
	}
	return res, writeAtomic(abs, data)
}

// writeAtomic replaces the file's content through a temp file and a rename. It
// writes through a symlink to its target and keeps a read-only file read-only.
func writeAtomic(abs string, data []byte) error {
	target := abs
	if r, err := filepath.EvalSymlinks(abs); err == nil {
		target = r
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	mode, readOnly := os.FileMode(0o644), false
	if fi, err := os.Stat(target); err == nil {
		mode = fi.Mode().Perm()
		if mode&0o200 == 0 {
			readOnly = true
			if err := os.Chmod(target, mode|0o200); err != nil {
				return err
			}
		}
	}
	tmp := target + ".oops-tmp"
	err := os.WriteFile(tmp, data, mode|0o200)
	if err == nil {
		err = os.Rename(tmp, target)
	}
	if err != nil {
		os.Remove(tmp)
	}
	if readOnly {
		if cerr := os.Chmod(target, mode); err == nil {
			err = cerr
		}
	}
	return err
}

// Remove deletes every version of the file.
func (s *Store) Remove(file string) error {
	abs, err := absPath(file)
	if err != nil {
		return err
	}
	ix, err := s.index(abs)
	if err != nil {
		return err
	}
	return s.RemoveHistory(ix)
}

// RemoveHistory deletes the history an index describes.
func (s *Store) RemoveHistory(ix *Index) error {
	dir := s.fileDir(ix.Path)
	unlock, err := lockFile(dir, s.LockTimeout)
	if err != nil {
		return err
	}
	defer unlock()
	return s.clearHistoryLocked(dir)
}

// clearHistoryLocked empties a history directory; the caller holds its lock. The index goes first, so a reader sees
// "not tracked", never an index whose content is gone. Everything is removed under the lock except the lock file
// itself: deleting the lock file would let a process still waiting on it and a newcomer hold the lock at once (on
// Unix the waiter locks the unlinked file), and removing the directory after unlocking would delete a history a
// concurrent save had just started there. The directory with only its lock file is reused by the next save.
func (s *Store) clearHistoryLocked(dir string) error {
	if err := os.Remove(filepath.Join(dir, "index.json")); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if s.beforeRemoveContent != nil {
		s.beforeRemoveContent(dir)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.Name() == ".lock" {
			continue
		}
		if err := os.RemoveAll(filepath.Join(dir, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

// MoveResult reports a move. MovedFile is false when only the history moved.
type MoveResult struct {
	From      string `json:"from"`
	To        string `json:"to"`
	MovedFile bool   `json:"movedFile"`
}

// Move carries a file's history to a new path, moving the file too when it is still at the old path.
// Both histories are locked for the whole move and the history is carried file by file (content is linked,
// or copied where a link is not possible), never by renaming its directory — so no lock is released early, and at
// every point one complete index describes the file: the new one is written before the old one is cleared, and
// a failure clears the new one and leaves the old history as it was.
func (s *Store) Move(from, to string) (MoveResult, error) {
	fa, err := absPath(from)
	if err != nil {
		return MoveResult{}, err
	}
	ta, err := absPath(to)
	if err != nil {
		return MoveResult{}, err
	}
	ix, err := s.index(fa)
	if err != nil {
		return MoveResult{}, err
	}
	src, dst := s.fileDir(fa), s.fileDir(ta)
	if src == dst {
		return s.renameInPlace(ix, src, fa, ta)
	}
	if err := s.checkNoHistory(dst, ta); err != nil {
		return MoveResult{}, err
	}
	res := MoveResult{From: fa, To: ta}
	if _, err := os.Stat(fa); err == nil {
		if _, err := os.Stat(ta); err == nil {
			return MoveResult{}, fmt.Errorf("target exists: %s", ta)
		}
		res.MovedFile = true
	}
	// lock in a fixed order so two opposite moves cannot deadlock
	first, second := src, dst
	if second < first {
		first, second = second, first
	}
	unlock1, err := lockFile(first, s.LockTimeout)
	if err != nil {
		return MoveResult{}, err
	}
	defer unlock1()
	unlock2, err := lockFile(second, s.LockTimeout)
	if err != nil {
		return MoveResult{}, err
	}
	defer unlock2()

	if err := s.checkNoHistory(dst, ta); err != nil { // again, under the lock
		return MoveResult{}, err
	}
	if ix, err = s.loadIx(src); err != nil || ix == nil || len(ix.Versions) == 0 { // re-read under the lock
		if err == nil {
			err = errf(CodeNotTracked, "not versioned yet: %s", fa)
		}
		return MoveResult{}, err
	}
	fail := func(err error) (MoveResult, error) {
		s.clearHistoryLocked(dst)
		return MoveResult{}, err
	}
	if err := carryBlobs(src, dst); err != nil {
		return fail(err)
	}
	moved := *ix
	moved.Path = ta
	if err := s.saveIx(&moved, dst); err != nil {
		return fail(err)
	}
	if res.MovedFile {
		if err := os.MkdirAll(filepath.Dir(ta), 0o755); err != nil {
			return fail(err)
		}
		if err := os.Rename(fa, ta); err != nil {
			return fail(err)
		}
	}
	if err := s.clearHistoryLocked(src); err != nil {
		return res, err
	}
	return res, nil
}

// checkNoHistory fails when dir holds versions. A directory left with only its lock file holds none.
func (s *Store) checkNoHistory(dir, abs string) error {
	existing, err := s.loadIx(dir)
	if err != nil {
		return err
	}
	if existing != nil && len(existing.Versions) > 0 {
		return errf(CodeAlreadyTracked, "%s already has a history", abs)
	}
	return nil
}

// carryBlobs puts every content file of src into dst: a hard link where the filesystem allows one, a copy otherwise.
func carryBlobs(src, dst string) error {
	entries, err := os.ReadDir(filepath.Join(src, "blobs"))
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(dst, "blobs"), 0o755); err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || strings.HasSuffix(e.Name(), ".tmp") {
			continue
		}
		from, to := filepath.Join(src, "blobs", e.Name()), filepath.Join(dst, "blobs", e.Name())
		if _, err := os.Stat(to); err == nil {
			continue // same content already there
		}
		if err := os.Link(from, to); err == nil {
			continue
		}
		if err := copyFile(from, to); err != nil {
			return err
		}
	}
	return nil
}

func copyFile(from, to string) error {
	b, err := os.ReadFile(from)
	if err != nil {
		return err
	}
	tmp := to + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, to)
}

// renameInPlace handles a move whose two paths share one history key (a case-only rename on Windows):
// the history stays where it is, only its recorded path and the file change.
func (s *Store) renameInPlace(ix *Index, dir, fa, ta string) (MoveResult, error) {
	res := MoveResult{From: fa, To: ta}
	if fa == ta {
		return res, nil
	}
	_, statErr := os.Stat(fa)
	res.MovedFile = statErr == nil
	unlock, err := lockFile(dir, s.LockTimeout)
	if err != nil {
		return MoveResult{}, err
	}
	defer unlock()
	ix.Path = ta
	if err := s.saveIx(ix, dir); err != nil {
		return MoveResult{}, err
	}
	if res.MovedFile {
		if err := os.Rename(fa, ta); err != nil {
			ix.Path = fa
			s.saveIx(ix, dir)
			return MoveResult{}, err
		}
	}
	return res, nil
}

// Unreadable names a history whose index could not be read.
type Unreadable struct {
	Dir   string `json:"dir"`
	Error string `json:"error"`
}

// Files lists every history in the store, and separately the ones whose index cannot be read.
func (s *Store) Files() ([]*Index, []Unreadable, error) {
	entries, err := os.ReadDir(filepath.Join(s.Root, "files"))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	var out []*Index
	var bad []Unreadable
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(s.Root, "files", e.Name())
		ix, err := s.loadIx(dir)
		if err != nil {
			bad = append(bad, Unreadable{Dir: dir, Error: err.Error()})
			continue
		}
		if ix == nil || len(ix.Versions) == 0 {
			continue // an empty directory or an emptied index holds no versions
		}
		out = append(out, ix)
	}
	return out, bad, nil
}

// Orphans lists histories whose file no longer exists on disk.
func (s *Store) Orphans() ([]*Index, error) {
	files, _, err := s.Files() // an unreadable index is never an orphan: gc must not delete what it cannot read
	if err != nil {
		return nil, err
	}
	var out []*Index
	for _, ix := range files {
		if _, err := os.Stat(ix.Path); errors.Is(err, os.ErrNotExist) {
			out = append(out, ix)
		}
	}
	return out, nil
}
