package utils

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureGitignoreNoGitignore(t *testing.T) {
	tmpDir := t.TempDir()

	// Should not error when no .gitignore exists
	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Errorf("EnsureGitignore should not error when no .gitignore exists: %v", err)
	}

	// Should not create .gitignore
	if FileExists(filepath.Join(tmpDir, ".gitignore")) {
		t.Error("EnsureGitignore should not create .gitignore")
	}
}

func TestEnsureGitignoreAlreadyHasEntry(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore with .oops/ already present
	if err := os.WriteFile(gitignorePath, []byte("node_modules/\n.oops/\n"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	// Should not duplicate entry
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	count := strings.Count(string(content), ".oops")
	if count != 1 {
		t.Errorf(".oops/ should appear only once, found %d times", count)
	}
}

func TestEnsureGitignoreAddsEntry(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore without .oops/
	if err := os.WriteFile(gitignorePath, []byte("node_modules/\n"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	// Should have .oops/ added
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(string(content), ".oops/") {
		t.Error(".gitignore should contain .oops/")
	}
}

func TestEnsureGitignoreEmptyFile(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create empty .gitignore
	if err := os.WriteFile(gitignorePath, []byte(""), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(string(content), ".oops/") {
		t.Error(".gitignore should contain .oops/")
	}
}

func TestEnsureGitignoreNoTrailingNewline(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore without trailing newline
	if err := os.WriteFile(gitignorePath, []byte("node_modules/"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	// Should have newline before .oops/
	if !strings.Contains(string(content), "node_modules/\n.oops/") {
		t.Errorf("Expected newline before .oops/, got: %q", string(content))
	}
}

func TestEnsureGitignoreWithoutSlash(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore with .oops (without trailing slash)
	if err := os.WriteFile(gitignorePath, []byte(".oops\n"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	// Should not duplicate (recognizes .oops as equivalent)
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	count := strings.Count(string(content), ".oops")
	if count != 1 {
		t.Errorf(".oops should appear only once, found %d times in: %q", count, string(content))
	}
}

func TestEnsureGitignoreWithWhitespace(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore with whitespace around entry
	if err := os.WriteFile(gitignorePath, []byte("  .oops/  \nother/\n"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	// Should recognize trimmed entry
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	count := strings.Count(string(content), ".oops")
	if count != 1 {
		t.Errorf(".oops should appear only once (whitespace trimmed), found %d times", count)
	}
}

func TestHasGitignoreEntryWithComments(t *testing.T) {
	tmpDir := t.TempDir()
	gitignorePath := filepath.Join(tmpDir, ".gitignore")

	// Create .gitignore with comments
	if err := os.WriteFile(gitignorePath, []byte("# comment\nnode_modules/\n# .oops/ commented out\n"), 0644); err != nil {
		t.Fatal(err)
	}

	err := EnsureGitignore(tmpDir)
	if err != nil {
		t.Fatalf("EnsureGitignore failed: %v", err)
	}

	// Should add .oops/ since commented one doesn't count
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatal(err)
	}

	if !strings.HasSuffix(strings.TrimSpace(string(content)), ".oops/") {
		t.Errorf("Should add .oops/ entry, got: %q", string(content))
	}
}
