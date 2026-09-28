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
// version is first kept as an auto version, so a restore never loses work.
func (s *Store) Restore(file string, n int, o SaveOptions) (RestoreResult, error) {
	abs, err := absPath(file)
	if err != nil {
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
			o.Kind = KindAuto
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

func writeAtomic(abs string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return err
	}
	tmp := abs + ".oops-tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, abs)
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
// still at the old path.
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
	if existing, _ := loadIndex(s.fileDir(ta)); existing != nil {
		return MoveResult{}, errf(CodeAlreadyTracked, "%s already has a history", ta)
	}
	res := MoveResult{From: fa, To: ta}
	if _, err := os.Stat(fa); err == nil {
		if _, err := os.Stat(ta); err == nil {
			return MoveResult{}, fmt.Errorf("target exists: %s", ta)
		}
		if err := os.MkdirAll(filepath.Dir(ta), 0o755); err != nil {
			return MoveResult{}, err
		}
		if err := os.Rename(fa, ta); err != nil {
			return MoveResult{}, err
		}
		res.MovedFile = true
	}
	src, dst := s.fileDir(fa), s.fileDir(ta)
	unlock, err := lockFile(src, s.LockTimeout)
	if err != nil {
		return MoveResult{}, err
	}
	ix.Path = ta
	err = ix.save(src)
	unlock()
	if err != nil {
		return MoveResult{}, err
	}
	return res, os.Rename(src, dst)
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
		ix, err := loadIndex(filepath.Join(s.Root, "files", e.Name()))
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
