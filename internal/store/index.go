package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

// Kind tells how a version was made; retention treats them differently.
type Kind string

const (
	KindManual Kind = "manual"
	KindAuto   Kind = "auto"
)

// Version is one saved state of a file.
type Version struct {
	N     int               `json:"n"`
	Hash  string            `json:"hash"`
	Size  int64             `json:"size"`
	Time  time.Time         `json:"time"`
	Kind  Kind              `json:"kind"`
	Actor string            `json:"actor,omitempty"`
	Label string            `json:"label,omitempty"`
	Meta  map[string]string `json:"meta,omitempty"`
}

// Index is a file's version list.
type Index struct {
	Format   int       `json:"format"`
	Path     string    `json:"path"`
	Next     int       `json:"next"`
	Versions []Version `json:"versions"`
}

const indexFormat = 2

func loadIndex(dir string) (*Index, error) {
	b, err := os.ReadFile(filepath.Join(dir, "index.json"))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var ix Index
	if err := json.Unmarshal(b, &ix); err != nil {
		return nil, err
	}
	return &ix, nil
}

// save writes the index atomically: a temp file, then a rename over the old one.
func (ix *Index) save(dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(ix, "", "  ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(dir, "index.json.tmp")
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	_, err = f.Write(b)
	if err == nil {
		err = f.Sync() // the rename must not land before the bytes do
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(dir, "index.json"))
}

// Latest is the newest version, nil when there is none.
func (ix *Index) Latest() *Version {
	if len(ix.Versions) == 0 {
		return nil
	}
	return &ix.Versions[len(ix.Versions)-1]
}

// Find returns version n, nil when it does not exist.
func (ix *Index) Find(n int) *Version {
	for i := range ix.Versions {
		if ix.Versions[i].N == n {
			return &ix.Versions[i]
		}
	}
	return nil
}

// HasHash reports whether any version has this content.
func (ix *Index) HasHash(h string) bool {
	for _, v := range ix.Versions {
		if v.Hash == h {
			return true
		}
	}
	return false
}
