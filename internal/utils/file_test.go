package utils

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFileExists(t *testing.T) {
	tmpDir := t.TempDir()
	existingFile := filepath.Join(tmpDir, "exists.txt")
	if err := os.WriteFile(existingFile, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"existing file", existingFile, true},
		{"non-existing file", filepath.Join(tmpDir, "notexists.txt"), false},
		{"directory", tmpDir, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FileExists(tt.path)
			if result != tt.expected {
				t.Errorf("FileExists(%q) = %v, want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestIsFile(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"regular file", testFile, true},
		{"directory", tmpDir, false},
		{"non-existing", filepath.Join(tmpDir, "notexists.txt"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsFile(tt.path)
			if result != tt.expected {
				t.Errorf("IsFile(%q) = %v, want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestIsDir(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"directory", tmpDir, true},
		{"regular file", testFile, false},
		{"non-existing", filepath.Join(tmpDir, "notexists"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsDir(tt.path)
			if result != tt.expected {
				t.Errorf("IsDir(%q) = %v, want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestAbsPath(t *testing.T) {
	// Test with relative path
	result := AbsPath("test.txt")
	if !filepath.IsAbs(result) {
		t.Errorf("AbsPath should return absolute path, got %q", result)
	}

	// Test with absolute path
	absPath := "/absolute/path/file.txt"
	result = AbsPath(absPath)
	if !filepath.IsAbs(result) {
		t.Errorf("AbsPath should return absolute path, got %q", result)
	}
}

func TestCopyFile(t *testing.T) {
	tmpDir := t.TempDir()
	srcFile := filepath.Join(tmpDir, "src.txt")
	dstFile := filepath.Join(tmpDir, "dst.txt")
	content := []byte("test content for copy")

	if err := os.WriteFile(srcFile, content, 0644); err != nil {
		t.Fatal(err)
	}

	// Test successful copy
	if err := CopyFile(srcFile, dstFile); err != nil {
		t.Fatalf("CopyFile failed: %v", err)
	}

	// Verify content
	copied, err := os.ReadFile(dstFile)
	if err != nil {
		t.Fatal(err)
	}
	if string(copied) != string(content) {
		t.Errorf("Copied content = %q, want %q", string(copied), string(content))
	}
}

func TestCopyFileSourceNotFound(t *testing.T) {
	tmpDir := t.TempDir()
	err := CopyFile(filepath.Join(tmpDir, "notexists.txt"), filepath.Join(tmpDir, "dst.txt"))
	if err == nil {
		t.Error("CopyFile should return error for non-existing source")
	}
}

func TestCopyFileInvalidDestination(t *testing.T) {
	tmpDir := t.TempDir()
	srcFile := filepath.Join(tmpDir, "src.txt")
	if err := os.WriteFile(srcFile, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	// Try to copy to invalid path
	err := CopyFile(srcFile, filepath.Join(tmpDir, "nonexistent", "subdir", "dst.txt"))
	if err == nil {
		t.Error("CopyFile should return error for invalid destination path")
	}
}
