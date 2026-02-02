package git

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/sergi/go-diff/diffmatchpatch"
)

// Repo represents a Git repository for a single file
type Repo struct {
	GitDir   string // .oops/filename.git
	WorkTree string // directory containing the file
	FileName string // the tracked file name
	repo     *git.Repository
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

// openRepo opens the repository if not already open
func (r *Repo) openRepo() (*git.Repository, error) {
	if r.repo != nil {
		return r.repo, nil
	}

	repo, err := git.PlainOpen(r.GitDir)
	if err != nil {
		return nil, err
	}
	r.repo = repo
	return repo, nil
}

// Init initializes a Git repository
func (r *Repo) Init() error {
	// Create directory if not exists
	if err := os.MkdirAll(r.GitDir, 0755); err != nil {
		return fmt.Errorf("failed to create git dir: %w", err)
	}

	// Initialize repository (not bare, since we need worktree)
	repo, err := git.PlainInit(r.GitDir, false)
	if err != nil {
		return fmt.Errorf("git init failed: %w", err)
	}

	r.repo = repo
	return nil
}

// Exists checks if the repository exists
func (r *Repo) Exists() bool {
	_, err := git.PlainOpen(r.GitDir)
	return err == nil
}

// Add stages the tracked file
func (r *Repo) Add() error {
	repo, err := r.openRepo()
	if err != nil {
		return err
	}

	wt, err := repo.Worktree()
	if err != nil {
		return err
	}

	// Copy file from WorkTree to repo's worktree
	srcPath := filepath.Join(r.WorkTree, r.FileName)
	dstPath := filepath.Join(r.GitDir, r.FileName)

	if err := copyFile(srcPath, dstPath); err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	_, err = wt.Add(r.FileName)
	return err
}

// Commit creates a new commit with the given message
func (r *Repo) Commit(message string) (string, error) {
	repo, err := r.openRepo()
	if err != nil {
		return "", err
	}

	wt, err := repo.Worktree()
	if err != nil {
		return "", err
	}

	status, err := wt.Status()
	if err != nil {
		return "", err
	}

	if status.IsClean() {
		return "", fmt.Errorf("no changes to save")
	}

	hash, err := wt.Commit(message, &git.CommitOptions{
		Author: &object.Signature{
			Name:  "oops",
			Email: "oops@local",
			When:  time.Now(),
		},
	})
	if err != nil {
		return "", err
	}

	return hash.String(), nil
}

// Tag creates a tag for the given commit
func (r *Repo) Tag(name string) error {
	repo, err := r.openRepo()
	if err != nil {
		return err
	}

	head, err := repo.Head()
	if err != nil {
		return err
	}

	_, err = repo.CreateTag(name, head.Hash(), nil)
	return err
}

// GetLatestTagNumber returns the highest tag number (vN format)
func (r *Repo) GetLatestTagNumber() (int, error) {
	repo, err := r.openRepo()
	if err != nil {
		return 0, nil
	}

	tags, err := repo.Tags()
	if err != nil {
		return 0, nil
	}

	maxNum := 0
	err = tags.ForEach(func(ref *plumbing.Reference) error {
		name := ref.Name().Short()
		if strings.HasPrefix(name, "v") {
			num, err := strconv.Atoi(strings.TrimPrefix(name, "v"))
			if err == nil && num > maxNum {
				maxNum = num
			}
		}
		return nil
	})
	if err != nil {
		return 0, nil
	}

	return maxNum, nil
}

// Checkout restores a file from a specific tag
func (r *Repo) Checkout(tag string) error {
	repo, err := r.openRepo()
	if err != nil {
		return err
	}

	// Get tag reference
	ref, err := repo.Tag(tag)
	if err != nil {
		return fmt.Errorf("tag not found: %s", tag)
	}

	// Get commit from tag
	commit, err := repo.CommitObject(ref.Hash())
	if err != nil {
		return err
	}

	// Get file from commit
	file, err := commit.File(r.FileName)
	if err != nil {
		return err
	}

	// Read content
	reader, err := file.Reader()
	if err != nil {
		return err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return err
	}

	// Write to work tree
	dstPath := filepath.Join(r.WorkTree, r.FileName)
	return os.WriteFile(dstPath, content, 0644)
}

// CheckoutHead restores the file to HEAD
func (r *Repo) CheckoutHead() error {
	repo, err := r.openRepo()
	if err != nil {
		return err
	}

	head, err := repo.Head()
	if err != nil {
		return err
	}

	commit, err := repo.CommitObject(head.Hash())
	if err != nil {
		return err
	}

	file, err := commit.File(r.FileName)
	if err != nil {
		return err
	}

	reader, err := file.Reader()
	if err != nil {
		return err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return err
	}

	dstPath := filepath.Join(r.WorkTree, r.FileName)
	return os.WriteFile(dstPath, content, 0644)
}

// Diff returns the diff between working file and HEAD (or between two refs)
func (r *Repo) Diff(refs ...string) (string, error) {
	repo, err := r.openRepo()
	if err != nil {
		return "", err
	}

	var oldContent, newContent string

	switch len(refs) {
	case 0:
		// Working file vs HEAD
		head, err := repo.Head()
		if err != nil {
			return "", err
		}
		commit, err := repo.CommitObject(head.Hash())
		if err != nil {
			return "", err
		}
		file, err := commit.File(r.FileName)
		if err != nil {
			oldContent = ""
		} else {
			reader, _ := file.Reader()
			content, _ := io.ReadAll(reader)
			reader.Close()
			oldContent = string(content)
		}

		// Read working file
		workPath := filepath.Join(r.WorkTree, r.FileName)
		workContent, err := os.ReadFile(workPath)
		if err != nil {
			return "", err
		}
		newContent = string(workContent)

	case 1:
		// Working file vs ref
		ref, err := repo.Tag(refs[0])
		if err != nil {
			return "", err
		}
		commit, err := repo.CommitObject(ref.Hash())
		if err != nil {
			return "", err
		}
		file, err := commit.File(r.FileName)
		if err != nil {
			oldContent = ""
		} else {
			reader, _ := file.Reader()
			content, _ := io.ReadAll(reader)
			reader.Close()
			oldContent = string(content)
		}

		workPath := filepath.Join(r.WorkTree, r.FileName)
		workContent, err := os.ReadFile(workPath)
		if err != nil {
			return "", err
		}
		newContent = string(workContent)

	case 2:
		// ref1 vs ref2
		ref1, err := repo.Tag(refs[0])
		if err != nil {
			return "", err
		}
		commit1, err := repo.CommitObject(ref1.Hash())
		if err != nil {
			return "", err
		}
		file1, err := commit1.File(r.FileName)
		if err != nil {
			oldContent = ""
		} else {
			reader, _ := file1.Reader()
			content, _ := io.ReadAll(reader)
			reader.Close()
			oldContent = string(content)
		}

		ref2, err := repo.Tag(refs[1])
		if err != nil {
			return "", err
		}
		commit2, err := repo.CommitObject(ref2.Hash())
		if err != nil {
			return "", err
		}
		file2, err := commit2.File(r.FileName)
		if err != nil {
			newContent = ""
		} else {
			reader, _ := file2.Reader()
			content, _ := io.ReadAll(reader)
			reader.Close()
			newContent = string(content)
		}
	}

	if oldContent == newContent {
		return "", nil
	}

	return generateUnifiedDiff(r.FileName, oldContent, newContent), nil
}

// generateUnifiedDiff creates a unified diff output
func generateUnifiedDiff(filename, oldContent, newContent string) string {
	dmp := diffmatchpatch.New()
	diffs := dmp.DiffMain(oldContent, newContent, true)

	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("--- a/%s\n", filename))
	buf.WriteString(fmt.Sprintf("+++ b/%s\n", filename))

	for _, diff := range diffs {
		lines := strings.Split(diff.Text, "\n")
		for i, line := range lines {
			if i == len(lines)-1 && line == "" {
				continue
			}
			switch diff.Type {
			case diffmatchpatch.DiffEqual:
				buf.WriteString(fmt.Sprintf(" %s\n", line))
			case diffmatchpatch.DiffDelete:
				buf.WriteString(fmt.Sprintf("-%s\n", line))
			case diffmatchpatch.DiffInsert:
				buf.WriteString(fmt.Sprintf("+%s\n", line))
			}
		}
	}

	return buf.String()
}

// Log returns commit history
func (r *Repo) Log() ([]Snapshot, error) {
	repo, err := r.openRepo()
	if err != nil {
		return nil, err
	}

	// Build tag map
	tagMap := make(map[string]int)
	tags, _ := repo.Tags()
	if tags != nil {
		tags.ForEach(func(ref *plumbing.Reference) error {
			name := ref.Name().Short()
			if strings.HasPrefix(name, "v") {
				num, err := strconv.Atoi(strings.TrimPrefix(name, "v"))
				if err == nil {
					tagMap[ref.Hash().String()] = num
				}
			}
			return nil
		})
	}

	head, err := repo.Head()
	if err != nil {
		return nil, err
	}

	commits, err := repo.Log(&git.LogOptions{From: head.Hash()})
	if err != nil {
		return nil, err
	}

	var snapshots []Snapshot
	err = commits.ForEach(func(c *object.Commit) error {
		hash := c.Hash.String()
		tagNum := tagMap[hash]

		snapshots = append(snapshots, Snapshot{
			Number:    tagNum,
			Message:   strings.TrimSpace(c.Message),
			Timestamp: c.Author.When,
			Hash:      hash[:7],
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	return snapshots, nil
}

// HasChanges checks if working file differs from HEAD
func (r *Repo) HasChanges() (bool, error) {
	repo, err := r.openRepo()
	if err != nil {
		return false, err
	}

	head, err := repo.Head()
	if err != nil {
		// No commits yet, check if file exists
		return true, nil
	}

	commit, err := repo.CommitObject(head.Hash())
	if err != nil {
		return false, err
	}

	file, err := commit.File(r.FileName)
	if err != nil {
		// File not in commit, so yes there are changes
		return true, nil
	}

	reader, err := file.Reader()
	if err != nil {
		return false, err
	}
	defer reader.Close()

	commitContent, err := io.ReadAll(reader)
	if err != nil {
		return false, err
	}

	// Read working file
	workPath := filepath.Join(r.WorkTree, r.FileName)
	workContent, err := os.ReadFile(workPath)
	if err != nil {
		return false, err
	}

	return !bytes.Equal(commitContent, workContent), nil
}

// GetCurrentTag returns the current tag (based on HEAD)
func (r *Repo) GetCurrentTag() (int, error) {
	repo, err := r.openRepo()
	if err != nil {
		return 0, nil
	}

	head, err := repo.Head()
	if err != nil {
		return 0, nil
	}

	headHash := head.Hash().String()

	tags, err := repo.Tags()
	if err != nil {
		return 0, nil
	}

	var currentNum int
	tags.ForEach(func(ref *plumbing.Reference) error {
		if ref.Hash().String() == headHash {
			name := ref.Name().Short()
			if strings.HasPrefix(name, "v") {
				num, err := strconv.Atoi(strings.TrimPrefix(name, "v"))
				if err == nil {
					currentNum = num
				}
			}
		}
		return nil
	})

	return currentNum, nil
}

// GetFilePath returns the full path to the tracked file
func (r *Repo) GetFilePath() string {
	return filepath.Join(r.WorkTree, r.FileName)
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}
