package store

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
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
	unlock() // released before deletion: Windows cannot remove a locked file
	return os.RemoveAll(dir)
}

// MoveResult reports a move. MovedFile is false when only the history moved.
type MoveResult struct {
	From      string `json:"from"`
	To        string `json:"to"`
	MovedFile bool   `json:"movedFile"`
}

// Move carries a file's history to a new path, moving the file too when it is
// still at the old path. The history moves first and is moved back if the file
// cannot follow, so a failure never leaves the two apart.
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
	if _, err := os.Stat(dst); err == nil {
		return MoveResult{}, errf(CodeAlreadyTracked, "%s already has a history", ta)
	}
	res := MoveResult{From: fa, To: ta}
	if _, err := os.Stat(fa); err == nil {
		if _, err := os.Stat(ta); err == nil {
			return MoveResult{}, fmt.Errorf("target exists: %s", ta)
		}
		res.MovedFile = true
	}
	unlock, err := lockFile(src, s.LockTimeout)
	if err != nil {
		return MoveResult{}, err
	}
	ix.Path = ta
	err = s.saveIx(ix, src)
	unlock() // released before the rename: Windows cannot rename a directory with an open file
	if err == nil {
		err = os.Rename(src, dst)
	}
	if err != nil {
		ix.Path = fa
		s.saveIx(ix, src)
		return MoveResult{}, err
	}
	if res.MovedFile {
		if err := os.MkdirAll(filepath.Dir(ta), 0o755); err == nil {
			err = os.Rename(fa, ta)
		}
		if err != nil {
			if rerr := os.Rename(dst, src); rerr == nil {
				ix.Path = fa
				s.saveIx(ix, src)
			}
			return MoveResult{}, err
		}
	}
	return res, nil
}

// Files lists every history in the store.
func (s *Store) Files() ([]*Index, error) {
	entries, err := os.ReadDir(filepath.Join(s.Root, "files"))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var out []*Index
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		ix, err := s.loadIx(filepath.Join(s.Root, "files", e.Name()))
		if err != nil || ix == nil {
			continue
		}
		out = append(out, ix)
	}
	return out, nil
}

// Orphans lists histories whose file no longer exists on disk.
func (s *Store) Orphans() ([]*Index, error) {
	files, err := s.Files()
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
