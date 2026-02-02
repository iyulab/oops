package store

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestFile(t *testing.T, content string) (string, func()) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	return testFile, func() {}
}

func TestNewStore(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, err := NewStore(testFile)
	if err != nil {
		t.Fatal(err)
	}

	if s.FileName != "test.txt" {
		t.Errorf("FileName = %q, want %q", s.FileName, "test.txt")
	}
}

func TestStoreInitialize(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "initial content")
	defer cleanup()

	s, err := NewStore(testFile)
	if err != nil {
		t.Fatal(err)
	}

	if err := s.Initialize(); err != nil {
		t.Fatalf("Initialize failed: %v", err)
	}

	if !s.Exists() {
		t.Error("Store should exist after Initialize")
	}
}

func TestStoreInitializeAlreadyTracked(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Try again
	s2, _ := NewStore(testFile)
	err := s2.Initialize()

	if err != ErrAlreadyTracked {
		t.Errorf("Expected ErrAlreadyTracked, got %v", err)
	}
}

func TestStoreSave(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Modify and save
	os.WriteFile(testFile, []byte("v2"), 0644)

	snapshot, err := s.Save("second version")
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	if snapshot.Number != 2 {
		t.Errorf("Snapshot number = %d, want 2", snapshot.Number)
	}
	if snapshot.Message != "second version" {
		t.Errorf("Message = %q, want %q", snapshot.Message, "second version")
	}
}

func TestStoreSaveNoChanges(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Save without changes
	_, err := s.Save("test")
	if err != ErrNoChanges {
		t.Errorf("Expected ErrNoChanges, got %v", err)
	}
}

func TestStoreBack(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1 content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	os.WriteFile(testFile, []byte("v2 content"), 0644)
	s.Save("v2")

	// Go back to v1
	if err := s.Back(1, false); err != nil {
		t.Fatalf("Back failed: %v", err)
	}

	content, _ := os.ReadFile(testFile)
	if string(content) != "v1 content" {
		t.Errorf("Content = %q, want %q", string(content), "v1 content")
	}
}

func TestStoreBackVersionNotFound(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	err := s.Back(999, false)
	if err != ErrVersionNotFound {
		t.Errorf("Expected ErrVersionNotFound, got %v", err)
	}
}

func TestStoreBackUncommittedChanges(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Modify without saving
	os.WriteFile(testFile, []byte("unsaved"), 0644)

	// Try to go back without force
	err := s.Back(1, false)
	if err != ErrUncommittedChanges {
		t.Errorf("Expected ErrUncommittedChanges, got %v", err)
	}

	// Force should work
	if err := s.Back(1, true); err != nil {
		t.Fatalf("Back with force failed: %v", err)
	}
}

func TestStoreUndo(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "original")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Modify
	os.WriteFile(testFile, []byte("modified"), 0644)

	// Undo
	if err := s.Undo(); err != nil {
		t.Fatalf("Undo failed: %v", err)
	}

	content, _ := os.ReadFile(testFile)
	if string(content) != "original" {
		t.Errorf("Content = %q, want %q", string(content), "original")
	}
}

func TestStoreChanges(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "original")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	// Modify
	os.WriteFile(testFile, []byte("modified"), 0644)

	diff, err := s.Changes()
	if err != nil {
		t.Fatalf("Changes failed: %v", err)
	}

	if diff == "" {
		t.Error("Diff should not be empty")
	}
}

func TestStoreHistory(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	os.WriteFile(testFile, []byte("v2"), 0644)
	s.Save("v2")

	snapshots, err := s.History()
	if err != nil {
		t.Fatalf("History failed: %v", err)
	}

	if len(snapshots) < 2 {
		t.Errorf("Expected at least 2 snapshots, got %d", len(snapshots))
	}
}

func TestStoreNow(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	current, latest, hasChanges, err := s.Now()
	if err != nil {
		t.Fatalf("Now failed: %v", err)
	}

	if current != 1 || latest != 1 {
		t.Errorf("current=%d, latest=%d, want 1,1", current, latest)
	}
	if hasChanges {
		t.Error("Should not have changes")
	}

	// Modify
	os.WriteFile(testFile, []byte("modified"), 0644)

	_, _, hasChanges, _ = s.Now()
	if !hasChanges {
		t.Error("Should have changes after modification")
	}
}

func TestStoreDelete(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	s.Initialize()

	if !s.Exists() {
		t.Error("Store should exist")
	}

	if err := s.Delete(); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if s.Exists() {
		t.Error("Store should not exist after Delete")
	}
}

func TestStoreNotTracked(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewStore(testFile)
	// Don't initialize

	_, err := s.Save("test")
	if err != ErrNotTracked {
		t.Errorf("Expected ErrNotTracked, got %v", err)
	}

	err = s.Back(1, false)
	if err != ErrNotTracked {
		t.Errorf("Expected ErrNotTracked, got %v", err)
	}
}

// --- Global Store Tests ---

func TestNewGlobalStore(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, err := NewGlobalStore(testFile)
	if err != nil {
		t.Fatal(err)
	}

	if !s.Global {
		t.Error("Expected Global flag to be true")
	}

	// Check that GitDir is in user home directory
	globalDir, _ := GetGlobalOopsDir()
	if !filepath.HasPrefix(s.GitDir, globalDir) {
		t.Errorf("GitDir %q should be under global dir %q", s.GitDir, globalDir)
	}
}

func TestGlobalStoreInitialize(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "global content")
	defer cleanup()

	s, err := NewGlobalStore(testFile)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Delete() // Clean up global store

	if err := s.Initialize(); err != nil {
		t.Fatalf("Global Initialize failed: %v", err)
	}

	if !s.Exists() {
		t.Error("Global store should exist after Initialize")
	}

	// Check metadata file exists
	metaFile := filepath.Join(s.OopsDirPath(), "metadata.txt")
	data, err := os.ReadFile(metaFile)
	if err != nil {
		t.Fatalf("Metadata file should exist: %v", err)
	}
	if string(data) != s.FilePath {
		t.Errorf("Metadata content = %q, want %q", string(data), s.FilePath)
	}
}

func TestGlobalStoreSave(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1")
	defer cleanup()

	s, _ := NewGlobalStore(testFile)
	defer s.Delete()
	s.Initialize()

	// Modify and save
	os.WriteFile(testFile, []byte("v2"), 0644)

	snapshot, err := s.Save("second version")
	if err != nil {
		t.Fatalf("Global Save failed: %v", err)
	}

	if snapshot.Number != 2 {
		t.Errorf("Snapshot number = %d, want 2", snapshot.Number)
	}
}

func TestGlobalStoreBack(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "v1 content")
	defer cleanup()

	s, _ := NewGlobalStore(testFile)
	defer s.Delete()
	s.Initialize()

	os.WriteFile(testFile, []byte("v2 content"), 0644)
	s.Save("v2")

	// Go back to v1
	if err := s.Back(1, false); err != nil {
		t.Fatalf("Global Back failed: %v", err)
	}

	content, _ := os.ReadFile(testFile)
	if string(content) != "v1 content" {
		t.Errorf("Content = %q, want %q", string(content), "v1 content")
	}
}

func TestListGlobalStores(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewGlobalStore(testFile)
	defer s.Delete()
	s.Initialize()

	stores, err := ListGlobalStores()
	if err != nil {
		t.Fatalf("ListGlobalStores failed: %v", err)
	}

	found := false
	for _, info := range stores {
		if info.FilePath == s.FilePath {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected to find test file in global stores list")
	}
}

func TestHashFilePath(t *testing.T) {
	hash1 := hashFilePath("/path/to/file1.txt")
	hash2 := hashFilePath("/path/to/file2.txt")
	hash3 := hashFilePath("/path/to/file1.txt")

	if hash1 == hash2 {
		t.Error("Different paths should have different hashes")
	}
	if hash1 != hash3 {
		t.Error("Same path should have same hash")
	}
	if len(hash1) != 16 {
		t.Errorf("Hash length = %d, want 16", len(hash1))
	}
}

func TestNormalizePath(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"/path/to/file.txt", "/path/to/file.txt"},
		{"C:\\Users\\test\\file.txt", "c:/Users/test/file.txt"},
		{"D:\\data\\oops\\test.go", "d:/data/oops/test.go"},
		{"/unix/path/file", "/unix/path/file"},
	}

	for _, tt := range tests {
		result := normalizePath(tt.input)
		if result != tt.expected {
			t.Errorf("normalizePath(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestHashFilePathCrossPlatform(t *testing.T) {
	// Windows and Unix paths for same logical file should hash the same
	winPath := "C:\\Users\\test\\file.txt"
	unixPath := "c:/Users/test/file.txt"

	hashWin := hashFilePath(winPath)
	hashUnix := hashFilePath(unixPath)

	if hashWin != hashUnix {
		t.Errorf("Cross-platform paths should have same hash: %q != %q", hashWin, hashUnix)
	}
}

func TestGlobalStoreDelete(t *testing.T) {
	testFile, cleanup := setupTestFile(t, "content")
	defer cleanup()

	s, _ := NewGlobalStore(testFile)
	s.Initialize()

	if !s.Exists() {
		t.Error("Store should exist")
	}

	hashDir := s.OopsDirPath()

	if err := s.Delete(); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if s.Exists() {
		t.Error("Store should not exist after Delete")
	}

	// Check that the entire hash directory is removed
	if _, err := os.Stat(hashDir); !os.IsNotExist(err) {
		t.Error("Hash directory should be removed after Delete")
	}
}
