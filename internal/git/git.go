package git

import (
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Repo represents a bare Git repository for a single file
type Repo struct {
	GitDir   string // .oops/filename.git
	WorkTree string // directory containing the file
	FileName string // the tracked file name
}

// Snapshot represents a version snapshot
type Snapshot struct {
	Number    int
	Message   string
	Timestamp time.Time
	Hash      string
}

// NewRepo creates a new Repo instance
func NewRepo(gitDir, workTree, fileName string) *Repo {
	return &Repo{
		GitDir:   gitDir,
		WorkTree: workTree,
		FileName: fileName,
	}
}

// git executes a git command with --git-dir and --work-tree
func (r *Repo) git(args ...string) (string, error) {
	fullArgs := []string{
		"--git-dir=" + r.GitDir,
		"--work-tree=" + r.WorkTree,
	}
	fullArgs = append(fullArgs, args...)

	cmd := exec.Command("git", fullArgs...)
	cmd.Dir = r.WorkTree

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("%s: %s", err, stderr.String())
	}

	return strings.TrimSpace(stdout.String()), nil
}

// gitBare executes a git command with only --git-dir (no work-tree)
func (r *Repo) gitBare(args ...string) (string, error) {
	fullArgs := []string{"--git-dir=" + r.GitDir}
	fullArgs = append(fullArgs, args...)

	cmd := exec.Command("git", fullArgs...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("%s: %s", err, stderr.String())
	}

	return strings.TrimSpace(stdout.String()), nil
}

// Init initializes a bare Git repository
func (r *Repo) Init() error {
	cmd := exec.Command("git", "init", "--bare", r.GitDir)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git init failed: %s", stderr.String())
	}

	// Configure for single file tracking
	r.gitBare("config", "core.bare", "false")
	r.gitBare("config", "core.worktree", r.WorkTree)

	return nil
}

// Exists checks if the repository exists
func (r *Repo) Exists() bool {
	cmd := exec.Command("git", "--git-dir="+r.GitDir, "rev-parse", "--git-dir")
	return cmd.Run() == nil
}

// Add stages the tracked file
func (r *Repo) Add() error {
	_, err := r.git("add", "-f", r.FileName)
	return err
}

// Commit creates a new commit with the given message
func (r *Repo) Commit(message string) (string, error) {
	hash, err := r.git("commit", "-m", message, "--allow-empty-message")
	if err != nil {
		// Check if nothing to commit
		if strings.Contains(err.Error(), "nothing to commit") {
			return "", fmt.Errorf("no changes to save")
		}
		return "", err
	}
	return hash, nil
}

// Tag creates a tag for the given commit
func (r *Repo) Tag(name string) error {
	_, err := r.gitBare("tag", name)
	return err
}

// GetLatestTagNumber returns the highest tag number (vN format)
func (r *Repo) GetLatestTagNumber() (int, error) {
	output, err := r.gitBare("tag", "-l", "v*", "--sort=-version:refname")
	if err != nil || output == "" {
		return 0, nil
	}

	lines := strings.Split(output, "\n")
	if len(lines) == 0 || lines[0] == "" {
		return 0, nil
	}

	// Parse vN format
	tag := strings.TrimPrefix(lines[0], "v")
	num, err := strconv.Atoi(tag)
	if err != nil {
		return 0, nil
	}

	return num, nil
}

// Checkout restores a file from a specific tag
func (r *Repo) Checkout(tag string) error {
	_, err := r.git("checkout", tag, "--", r.FileName)
	return err
}

// CheckoutHead restores the file to HEAD
func (r *Repo) CheckoutHead() error {
	_, err := r.git("checkout", "HEAD", "--", r.FileName)
	return err
}

// Diff returns the diff between working file and HEAD (or between two refs)
func (r *Repo) Diff(refs ...string) (string, error) {
	args := []string{"diff", "--color=always"}

	switch len(refs) {
	case 0:
		// Working file vs HEAD
		args = append(args, "HEAD", "--", r.FileName)
	case 1:
		// Working file vs ref
		args = append(args, refs[0], "--", r.FileName)
	case 2:
		// ref1 vs ref2
		args = append(args, refs[0], refs[1], "--", r.FileName)
	}

	return r.git(args...)
}

// Log returns commit history
func (r *Repo) Log() ([]Snapshot, error) {
	// Get log with tag info
	format := "%H|%s|%ct"
	output, err := r.gitBare("log", "--format="+format, "--tags")
	if err != nil {
		return nil, err
	}

	if output == "" {
		return nil, nil
	}

	lines := strings.Split(output, "\n")
	var snapshots []Snapshot

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "|", 3)
		if len(parts) != 3 {
			continue
		}

		hash := parts[0]
		message := parts[1]
		timestamp, _ := strconv.ParseInt(parts[2], 10, 64)

		// Find tag number for this commit
		tagNum := r.getTagNumber(hash)

		snapshots = append(snapshots, Snapshot{
			Number:    tagNum,
			Message:   message,
			Timestamp: time.Unix(timestamp, 0),
			Hash:      hash[:7],
		})
	}

	return snapshots, nil
}

// getTagNumber finds the tag number for a commit hash
func (r *Repo) getTagNumber(hash string) int {
	output, err := r.gitBare("tag", "--points-at", hash)
	if err != nil || output == "" {
		return 0
	}

	for _, tag := range strings.Split(output, "\n") {
		if strings.HasPrefix(tag, "v") {
			num, err := strconv.Atoi(strings.TrimPrefix(tag, "v"))
			if err == nil {
				return num
			}
		}
	}
	return 0
}

// HasChanges checks if working file differs from HEAD
func (r *Repo) HasChanges() (bool, error) {
	output, err := r.git("status", "--porcelain", "--", r.FileName)
	if err != nil {
		return false, err
	}
	return output != "", nil
}

// GetCurrentTag returns the current tag (based on HEAD)
func (r *Repo) GetCurrentTag() (int, error) {
	output, err := r.gitBare("describe", "--tags", "--abbrev=0", "HEAD")
	if err != nil {
		return 0, nil
	}

	num, err := strconv.Atoi(strings.TrimPrefix(output, "v"))
	if err != nil {
		return 0, nil
	}

	return num, nil
}

// GetFilePath returns the full path to the tracked file
func (r *Repo) GetFilePath() string {
	return filepath.Join(r.WorkTree, r.FileName)
}
