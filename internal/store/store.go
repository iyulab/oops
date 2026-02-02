package store

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/compress"
	"github.com/iyulab/oops/internal/git"
)

const (
	OopsDir = ".oops"
)

var (
	ErrNotTracked         = errors.New("file is not tracked")
	ErrAlreadyTracked     = errors.New("file is already tracked")
	ErrNoChanges          = errors.New("no changes to save")
	ErrVersionNotFound    = errors.New("version not found")
	ErrUncommittedChanges = errors.New("uncommitted changes exist")
)

// Store manages versioning for a single file using Git backend
type Store struct {
	FilePath string
	FileName string
	BaseDir  string
	GitDir   string
	Repo     *git.Repo
}

// Snapshot represents a version snapshot (re-exported from git package)
type Snapshot = git.Snapshot

// NewStore creates a store instance for a file
func NewStore(filePath string) (*Store, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, err
	}

	baseDir := filepath.Dir(absPath)
	fileName := filepath.Base(absPath)
	gitDir := filepath.Join(baseDir, OopsDir, fileName+".git")

	s := &Store{
		FilePath: absPath,
		FileName: fileName,
		BaseDir:  baseDir,
		GitDir:   gitDir,
		Repo:     git.NewRepo(gitDir, baseDir, fileName),
	}

	return s, nil
}

// OopsDirPath returns the path to .oops directory
func (s *Store) OopsDirPath() string {
	return filepath.Join(s.BaseDir, OopsDir)
}

// Exists checks if the store exists (file is tracked)
func (s *Store) Exists() bool {
	return s.Repo.Exists()
}

// Initialize creates a new store for tracking (start/track)
func (s *Store) Initialize() error {
	if s.Exists() {
		return ErrAlreadyTracked
	}

	// Check if file exists
	if _, err := os.Stat(s.FilePath); err != nil {
		return fmt.Errorf("file not found: %s", s.FilePath)
	}

	// Create .oops directory
	if err := os.MkdirAll(s.OopsDirPath(), 0755); err != nil {
		return err
	}

	// Initialize bare Git repository
	if err := s.Repo.Init(); err != nil {
		return err
	}

	// Stage and commit initial version
	if err := s.Repo.Add(); err != nil {
		return err
	}

	if _, err := s.Repo.Commit("Initial snapshot"); err != nil {
		return err
	}

	// Tag as v1
	if err := s.Repo.Tag("v1"); err != nil {
		return err
	}

	return nil
}

// Save creates a new snapshot (save/commit)
func (s *Store) Save(message string) (*Snapshot, error) {
	if !s.Exists() {
		return nil, ErrNotTracked
	}

	// Check for changes
	hasChanges, err := s.Repo.HasChanges()
	if err != nil {
		return nil, err
	}
	if !hasChanges {
		return nil, ErrNoChanges
	}

	// Get next version number
	latestNum, err := s.Repo.GetLatestTagNumber()
	if err != nil {
		return nil, err
	}
	nextNum := latestNum + 1

	// Default message
	if message == "" {
		message = fmt.Sprintf("Snapshot #%d", nextNum)
	}

	// Stage and commit
	if err := s.Repo.Add(); err != nil {
		return nil, err
	}

	if _, err := s.Repo.Commit(message); err != nil {
		if strings.Contains(err.Error(), "no changes") {
			return nil, ErrNoChanges
		}
		return nil, err
	}

	// Tag with version number
	tag := fmt.Sprintf("v%d", nextNum)
	if err := s.Repo.Tag(tag); err != nil {
		return nil, err
	}

	return &Snapshot{
		Number:  nextNum,
		Message: message,
	}, nil
}

// Back restores a specific version (back/checkout)
func (s *Store) Back(num int, force bool) error {
	if !s.Exists() {
		return ErrNotTracked
	}

	// Validate version exists
	latestNum, err := s.Repo.GetLatestTagNumber()
	if err != nil {
		return err
	}
	if num < 1 || num > latestNum {
		return ErrVersionNotFound
	}

	// Check for uncommitted changes
	if !force {
		hasChanges, err := s.Repo.HasChanges()
		if err != nil {
			return err
		}
		if hasChanges {
			return ErrUncommittedChanges
		}
	}

	// Checkout the version
	tag := fmt.Sprintf("v%d", num)
	return s.Repo.Checkout(tag)
}

// Undo restores to HEAD (undo unsaved changes)
func (s *Store) Undo() error {
	if !s.Exists() {
		return ErrNotTracked
	}
	return s.Repo.CheckoutHead()
}

// Changes returns diff output (changes/diff)
func (s *Store) Changes(versions ...int) (string, error) {
	if !s.Exists() {
		return "", ErrNotTracked
	}

	switch len(versions) {
	case 0:
		// Working file vs HEAD
		return s.Repo.Diff()
	case 1:
		// Working file vs version N
		return s.Repo.Diff(fmt.Sprintf("v%d", versions[0]))
	case 2:
		// Version A vs Version B
		return s.Repo.Diff(fmt.Sprintf("v%d", versions[0]), fmt.Sprintf("v%d", versions[1]))
	}

	return "", nil
}

// History returns all snapshots (history/log)
func (s *Store) History() ([]Snapshot, error) {
	if !s.Exists() {
		return nil, ErrNotTracked
	}
	return s.Repo.Log()
}

// Now returns current status (now/status)
func (s *Store) Now() (current int, latest int, hasChanges bool, err error) {
	if !s.Exists() {
		err = ErrNotTracked
		return
	}

	latest, err = s.Repo.GetLatestTagNumber()
	if err != nil {
		return
	}

	current, err = s.Repo.GetCurrentTag()
	if err != nil {
		current = latest // Default to latest if no current tag
		err = nil
	}

	hasChanges, err = s.Repo.HasChanges()
	return
}

// Delete removes the store (done/untrack)
func (s *Store) Delete() error {
	return os.RemoveAll(s.GitDir)
}

// GetLatestVersion returns the latest version number
func (s *Store) GetLatestVersion() (int, error) {
	return s.Repo.GetLatestTagNumber()
}

// ShouldCompress checks if the tracked file should be compressed
func (s *Store) ShouldCompress() bool {
	return compress.ShouldCompress(s.FileName)
}
