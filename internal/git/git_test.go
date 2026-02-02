package git

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestRepo(t *testing.T) (*Repo, string, func()) {
	tmpDir := t.TempDir()
	testFile := "test.txt"
	testFilePath := filepath.Join(tmpDir, testFile)

	// Create test file
	if err := os.WriteFile(testFilePath, []byte("initial content"), 0644); err != nil {
		t.Fatal(err)
	}

	gitDir := filepath.Join(tmpDir, ".oops", testFile+".git")
	repo := NewRepo(gitDir, tmpDir, testFile)

	cleanup := func() {}
	return repo, tmpDir, cleanup
}

func TestRepoInit(t *testing.T) {
	repo, _, cleanup := setupTestRepo(t)
	defer cleanup()

	if err := repo.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}

	if !repo.Exists() {
		t.Error("Repo should exist after Init")
	}
}

func TestRepoInitAndCommit(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	if err := repo.Init(); err != nil {
		t.Fatal(err)
	}

	// Add and commit
	if err := repo.Add(); err != nil {
		t.Fatalf("Add failed: %v", err)
	}

	_, err := repo.Commit("Initial commit")
	if err != nil {
		t.Fatalf("Commit failed: %v", err)
	}

	// Tag
	if err := repo.Tag("v1"); err != nil {
		t.Fatalf("Tag failed: %v", err)
	}

	// Check latest tag
	num, err := repo.GetLatestTagNumber()
	if err != nil {
		t.Fatalf("GetLatestTagNumber failed: %v", err)
	}
	if num != 1 {
		t.Errorf("Latest tag = %d, want 1", num)
	}

	// Modify and commit again
	testFilePath := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFilePath, []byte("modified content"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := repo.Add(); err != nil {
		t.Fatal(err)
	}

	_, err = repo.Commit("Second commit")
	if err != nil {
		t.Fatal(err)
	}

	if err := repo.Tag("v2"); err != nil {
		t.Fatal(err)
	}

	num, _ = repo.GetLatestTagNumber()
	if num != 2 {
		t.Errorf("Latest tag = %d, want 2", num)
	}
}

func TestRepoCheckout(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	testFilePath := filepath.Join(tmpDir, "test.txt")

	// Init and first commit
	repo.Init()
	repo.Add()
	repo.Commit("v1")
	repo.Tag("v1")

	// Second version
	os.WriteFile(testFilePath, []byte("version 2"), 0644)
	repo.Add()
	repo.Commit("v2")
	repo.Tag("v2")

	// Checkout v1
	if err := repo.Checkout("v1"); err != nil {
		t.Fatalf("Checkout failed: %v", err)
	}

	content, _ := os.ReadFile(testFilePath)
	if string(content) != "initial content" {
		t.Errorf("Content = %q, want %q", string(content), "initial content")
	}
}

func TestRepoHasChanges(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	testFilePath := filepath.Join(tmpDir, "test.txt")

	repo.Init()
	repo.Add()
	repo.Commit("Initial")
	repo.Tag("v1")

	// No changes initially
	hasChanges, err := repo.HasChanges()
	if err != nil {
		t.Fatal(err)
	}
	if hasChanges {
		t.Error("Should not have changes initially")
	}

	// Modify file
	os.WriteFile(testFilePath, []byte("modified"), 0644)

	hasChanges, err = repo.HasChanges()
	if err != nil {
		t.Fatal(err)
	}
	if !hasChanges {
		t.Error("Should have changes after modification")
	}
}

func TestRepoDiff(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	testFilePath := filepath.Join(tmpDir, "test.txt")

	repo.Init()
	repo.Add()
	repo.Commit("Initial")
	repo.Tag("v1")

	// Modify file
	os.WriteFile(testFilePath, []byte("modified content"), 0644)

	diff, err := repo.Diff()
	if err != nil {
		t.Fatalf("Diff failed: %v", err)
	}

	if diff == "" {
		t.Error("Diff should not be empty")
	}
}

func TestRepoLog(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	testFilePath := filepath.Join(tmpDir, "test.txt")

	repo.Init()
	repo.Add()
	repo.Commit("First commit")
	repo.Tag("v1")

	os.WriteFile(testFilePath, []byte("v2"), 0644)
	repo.Add()
	repo.Commit("Second commit")
	repo.Tag("v2")

	snapshots, err := repo.Log()
	if err != nil {
		t.Fatalf("Log failed: %v", err)
	}

	if len(snapshots) < 2 {
		t.Errorf("Expected at least 2 snapshots, got %d", len(snapshots))
	}
}

func TestRepoExists(t *testing.T) {
	repo, _, cleanup := setupTestRepo(t)
	defer cleanup()

	if repo.Exists() {
		t.Error("Repo should not exist before Init")
	}

	repo.Init()

	if !repo.Exists() {
		t.Error("Repo should exist after Init")
	}
}

func TestRepoCheckoutHead(t *testing.T) {
	repo, tmpDir, cleanup := setupTestRepo(t)
	defer cleanup()

	testFilePath := filepath.Join(tmpDir, "test.txt")

	repo.Init()
	repo.Add()
	repo.Commit("Initial")
	repo.Tag("v1")

	// Modify file
	os.WriteFile(testFilePath, []byte("unsaved changes"), 0644)

	// Checkout HEAD (undo changes)
	if err := repo.CheckoutHead(); err != nil {
		t.Fatalf("CheckoutHead failed: %v", err)
	}

	content, _ := os.ReadFile(testFilePath)
	if string(content) != "initial content" {
		t.Errorf("Content = %q, want %q", string(content), "initial content")
	}
}
