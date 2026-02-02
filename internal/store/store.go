package store

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/compress"
	"github.com/iyulab/oops/internal/git"
)

const (
	OopsDir       = ".oops"
	GlobalOopsDir = ".oops" // stored in user home directory
)

var (
	ErrNotTracked         = errors.New("file is not tracked")
	ErrAlreadyTracked     = errors.New("file is already tracked")
	ErrNoChanges          = errors.New("no changes to save")
	ErrVersionNotFound    = errors.New("version not found")
	ErrUncommittedChanges = errors.New("uncommitted changes exist")
)

// StoreOptions configures Store behavior
type StoreOptions struct {
	Global bool // Use global storage in user home directory
}

// Store manages versioning for a single file using Git backend
type Store struct {
	FilePath string
	FileName string
	BaseDir  string
	GitDir   string
	Repo     *git.Repo
	Global   bool // true if using global storage
}

// Snapshot represents a version snapshot (re-exported from git package)
type Snapshot = git.Snapshot

// GetGlobalOopsDir returns the global .oops directory path
func GetGlobalOopsDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	return filepath.Join(homeDir, GlobalOopsDir), nil
}

// normalizePath normalizes file path for cross-platform compatibility
// Converts backslashes to forward slashes and lowercases drive letters on Windows
func normalizePath(absPath string) string {
	// Convert backslashes to forward slashes for consistency
	normalized := strings.ReplaceAll(absPath, "\\", "/")
	// Lowercase drive letter on Windows (e.g., C: -> c:)
	if len(normalized) >= 2 && normalized[1] == ':' {
		normalized = strings.ToLower(normalized[:1]) + normalized[1:]
	}
	return normalized
}

// hashFilePath creates a short hash from file path for global storage
func hashFilePath(absPath string) string {
	normalized := normalizePath(absPath)
	hash := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(hash[:8]) // 16 chars
}

// NewStore creates a store instance for a file (local mode)
func NewStore(filePath string) (*Store, error) {
	return NewStoreWithOptions(filePath, StoreOptions{Global: false})
}

// NewGlobalStore creates a store instance for a file (global mode)
func NewGlobalStore(filePath string) (*Store, error) {
	return NewStoreWithOptions(filePath, StoreOptions{Global: true})
}

// NewStoreWithOptions creates a store instance with specified options
func NewStoreWithOptions(filePath string, opts StoreOptions) (*Store, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, err
	}

	baseDir := filepath.Dir(absPath)
	fileName := filepath.Base(absPath)

	var gitDir string
	if opts.Global {
		globalDir, err := GetGlobalOopsDir()
		if err != nil {
			return nil, err
		}
		// Use hash of full path to create unique directory
		pathHash := hashFilePath(absPath)
		gitDir = filepath.Join(globalDir, pathHash, fileName+".git")
	} else {
		gitDir = filepath.Join(baseDir, OopsDir, fileName+".git")
	}

	s := &Store{
		FilePath: absPath,
		FileName: fileName,
		BaseDir:  baseDir,
		GitDir:   gitDir,
		Repo:     git.NewRepo(gitDir, baseDir, fileName),
		Global:   opts.Global,
	}

	return s, nil
}

// OopsDirPath returns the path to .oops directory
func (s *Store) OopsDirPath() string {
	if s.Global {
		globalDir, _ := GetGlobalOopsDir()
		pathHash := hashFilePath(s.FilePath)
		return filepath.Join(globalDir, pathHash)
	}
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

	// Save metadata for global stores
	if err := s.saveMetadata(); err != nil {
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
	if s.Global {
		// Remove the entire hash directory for global stores
		return os.RemoveAll(s.OopsDirPath())
	}
	return os.RemoveAll(s.GitDir)
}

// saveMetadata saves file path metadata for global stores
func (s *Store) saveMetadata() error {
	if !s.Global {
		return nil
	}
	metaFile := filepath.Join(s.OopsDirPath(), "metadata.txt")
	return os.WriteFile(metaFile, []byte(s.FilePath), 0644)
}

// GlobalStoreInfo represents info about a globally tracked file
type GlobalStoreInfo struct {
	FilePath string
	FileName string
	HashDir  string
}

// ListGlobalStores returns all globally tracked files
func ListGlobalStores() ([]GlobalStoreInfo, error) {
	globalDir, err := GetGlobalOopsDir()
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(globalDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var stores []GlobalStoreInfo
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		hashDir := filepath.Join(globalDir, entry.Name())
		metaFile := filepath.Join(hashDir, "metadata.txt")

		data, err := os.ReadFile(metaFile)
		if err != nil {
			continue // Skip if no metadata
		}

		filePath := string(data)
		stores = append(stores, GlobalStoreInfo{
			FilePath: filePath,
			FileName: filepath.Base(filePath),
			HashDir:  entry.Name(),
		})
	}

	return stores, nil
}

// FindGlobalStore finds an existing global store for a file path
func FindGlobalStore(filePath string) (*Store, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, err
	}

	s, err := NewGlobalStore(absPath)
	if err != nil {
		return nil, err
	}

	if !s.Exists() {
		return nil, ErrNotTracked
	}

	return s, nil
}

// GetLatestVersion returns the latest version number
func (s *Store) GetLatestVersion() (int, error) {
	return s.Repo.GetLatestTagNumber()
}

// CheckDuplicateTracking checks if file is tracked in both local and global
// Returns (hasLocal, hasGlobal)
func CheckDuplicateTracking(filePath string) (bool, bool) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return false, false
	}

	// Check local
	localStore, err := NewStore(absPath)
	hasLocal := err == nil && localStore.Exists()

	// Check global
	globalStore, err := NewGlobalStore(absPath)
	hasGlobal := err == nil && globalStore.Exists()

	return hasLocal, hasGlobal
}

// ShouldCompress checks if the tracked file should be compressed
func (s *Store) ShouldCompress() bool {
	return compress.ShouldCompress(s.FileName)
}
