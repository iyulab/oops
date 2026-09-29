package store

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// OopsDir is the name of a local store directory.
const OopsDir = ".oops"

// NormalizePath makes one spelling per file: forward slashes, and on Windows
// (case-insensitive file system) the whole path in lower case.
func NormalizePath(abs string) string {
	p := strings.ReplaceAll(filepath.Clean(abs), "\\", "/")
	if runtime.GOOS == "windows" {
		p = strings.ToLower(p)
	}
	return p
}

// FileKey names a file's directory inside a store.
func FileKey(abs string) string {
	sum := sha256.Sum256([]byte(NormalizePath(abs)))
	return hex.EncodeToString(sum[:8])
}

// GlobalRoot is the store in the user's home directory.
func GlobalRoot() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	return filepath.Join(home, OopsDir), nil
}
