package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/iyulab/oops/internal/compress"
)

// Store is a directory holding the version history of any number of files.
type Store struct {
	Root        string
	LockTimeout time.Duration
	base        string // when set, files under base are keyed and recorded by their path relative to it
	now         func() time.Time
}

// Open returns the store rooted at root. Nothing is created until a version is saved.
func Open(root string) *Store {
	return &Store{Root: root, LockTimeout: 10 * time.Second, now: time.Now}
}

// SaveOptions describes the version a save creates.
type SaveOptions struct {
	Kind  Kind
	Actor string
	Label string
	Meta  map[string]string
}

// SaveResult reports a save. Saved is false when the content equals the latest version.
type SaveResult struct {
	Saved   bool    `json:"saved"`
	Reason  string  `json:"reason,omitempty"`
	Path    string  `json:"path"`
	Version Version `json:"version"`
}

// Status compares a file on disk with its history.
type Status struct {
	Path    string `json:"path"`
	Exists  bool   `json:"exists"`
	Latest  int    `json:"latest"`
	Current int    `json:"current"`
	Changed bool   `json:"changed"`
}

func (s *Store) fileDir(abs string) string {
	key := abs
	if rel := s.relPath(abs); rel != "" {
		key = "rel:" + rel
	}
	return filepath.Join(s.Root, "files", FileKey(key))
}

func absPath(file string) (string, error) {
	return filepath.Abs(file)
}

func readTarget(abs string) ([]byte, error) {
	b, err := os.ReadFile(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil, errf(CodeFileNotFound, "file not found: %s", abs)
	}
	return b, err
}

// Save records the file's current content as a new version. Saving content
// equal to the latest version is a successful no-op (Saved=false, Reason "unchanged").
func (s *Store) Save(file string, o SaveOptions) (SaveResult, error) {
	abs, err := absPath(file)
	if err != nil {
		return SaveResult{}, err
	}
	data, err := readTarget(abs)
	if err != nil {
		return SaveResult{}, err
	}
	dir := s.fileDir(abs)
	unlock, err := lockFile(dir, s.LockTimeout)
	if err != nil {
		return SaveResult{}, err
	}
	defer unlock()
	return s.saveLocked(abs, dir, data, o)
}

func (s *Store) saveLocked(abs, dir string, data []byte, o SaveOptions) (SaveResult, error) {
	ix, err := s.loadIx(dir)
	if err != nil {
		return SaveResult{}, err
	}
	if ix == nil {
		ix = &Index{Format: indexFormat, Path: abs, Next: 1}
	}
	h := HashBytes(data)
	if l := ix.Latest(); l != nil && l.Hash == h {
		return SaveResult{Saved: false, Reason: "unchanged", Path: ix.Path, Version: *l}, nil
	}
	if _, err := putBlob(dir, data, compress.ShouldCompress(abs)); err != nil {
		return SaveResult{}, err
	}
	kind := o.Kind
	if kind == "" {
		kind = KindManual
	}
	v := Version{N: ix.Next, Hash: h, Size: int64(len(data)), Time: s.now().UTC(),
		Kind: kind, Actor: o.Actor, Label: o.Label, Meta: o.Meta}
	ix.Versions = append(ix.Versions, v)
	ix.Next++
	if err := s.saveIx(ix, dir); err != nil {
		return SaveResult{}, err
	}
	return SaveResult{Saved: true, Path: ix.Path, Version: v}, nil
}

func (s *Store) index(abs string) (*Index, error) {
	ix, err := s.loadIx(s.fileDir(abs))
	if err != nil {
		return nil, err
	}
	if ix == nil {
		return nil, errf(CodeNotTracked, "not versioned yet: %s", abs)
	}
	return ix, nil
}

// History returns the file's versions, oldest first.
func (s *Store) History(file string) (*Index, error) {
	abs, err := absPath(file)
	if err != nil {
		return nil, err
	}
	return s.index(abs)
}

// Content returns the bytes of version n.
func (s *Store) Content(file string, n int) ([]byte, error) {
	abs, err := absPath(file)
	if err != nil {
		return nil, err
	}
	ix, err := s.index(abs)
	if err != nil {
		return nil, err
	}
	v := ix.Find(n)
	if v == nil {
		return nil, errf(CodeVersionNotFound, "version #%d not found for %s", n, abs)
	}
	return getBlob(s.fileDir(abs), v.Hash)
}

// Status compares the file on disk with its history. Current is the newest
// version whose content equals the file, 0 when none does.
func (s *Store) Status(file string) (Status, error) {
	abs, err := absPath(file)
	if err != nil {
		return Status{}, err
	}
	ix, err := s.index(abs)
	if err != nil {
		return Status{}, err
	}
	st := Status{Path: ix.Path}
	if l := ix.Latest(); l != nil {
		st.Latest = l.N
	}
	data, err := os.ReadFile(abs)
	if errors.Is(err, os.ErrNotExist) {
		return st, nil
	}
	if err != nil {
		return Status{}, err
	}
	st.Exists = true
	h := HashBytes(data)
	for i := len(ix.Versions) - 1; i >= 0; i-- {
		if ix.Versions[i].Hash == h {
			st.Current = ix.Versions[i].N
			break
		}
	}
	st.Changed = st.Current == 0
	return st, nil
}

// OpenLocal returns the store kept in base/.oops. Files under base are recorded
// by their path relative to base, so renaming or moving the folder keeps its history.
func OpenLocal(base string) *Store {
	s := Open(filepath.Join(base, OopsDir))
	if abs, err := filepath.Abs(base); err == nil {
		s.base = abs
	}
	return s
}

// relPath is abs relative to the store's base, "" when abs is not under it.
func (s *Store) relPath(abs string) string {
	if s.base == "" {
		return ""
	}
	rel, err := filepath.Rel(s.base, abs)
	if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return ""
	}
	return filepath.ToSlash(rel)
}

// resolve turns a recorded path back into an absolute one.
func (s *Store) resolve(p string) string {
	if s.base != "" && !filepath.IsAbs(p) {
		return filepath.Join(s.base, filepath.FromSlash(p))
	}
	return p
}

func (s *Store) loadIx(dir string) (*Index, error) {
	ix, err := loadIndex(dir)
	if ix != nil {
		ix.Path = s.resolve(ix.Path)
	}
	return ix, err
}

func (s *Store) saveIx(ix *Index, dir string) error {
	rec := *ix
	if rel := s.relPath(ix.Path); rel != "" {
		rec.Path = rel
	}
	return rec.save(dir)
}
