package utils

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

const oopsEntry = ".oops/"

// EnsureGitignore adds .oops/ to .gitignore if it exists and doesn't have the entry
func EnsureGitignore(dir string) error {
	gitignorePath := filepath.Join(dir, ".gitignore")

	// Check if .gitignore exists
	if !FileExists(gitignorePath) {
		return nil // No .gitignore, nothing to do
	}

	// Check if already has .oops/ entry
	hasEntry, err := hasGitignoreEntry(gitignorePath, oopsEntry)
	if err != nil {
		return err
	}
	if hasEntry {
		return nil // Already present
	}

	// Append .oops/ to .gitignore
	f, err := os.OpenFile(gitignorePath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	// Check if file ends with newline
	content, err := os.ReadFile(gitignorePath)
	if err != nil {
		return err
	}

	prefix := "\n"
	if len(content) == 0 || content[len(content)-1] == '\n' {
		prefix = ""
	}

	_, err = f.WriteString(prefix + oopsEntry + "\n")
	return err
}

// hasGitignoreEntry checks if .gitignore contains a specific entry
func hasGitignoreEntry(path, entry string) (bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return false, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == entry || line == strings.TrimSuffix(entry, "/") {
			return true, nil
		}
	}

	return false, scanner.Err()
}
