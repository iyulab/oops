package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/store"
)

// findTrackedStore finds a tracked file in the current directory
func findTrackedStore() (*store.Store, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}

	oopsDir := filepath.Join(cwd, store.OopsDir)
	entries, err := os.ReadDir(oopsDir)
	if err != nil {
		return nil, fmt.Errorf("no tracked files found\nUse 'oops start <file>' to begin")
	}

	var stores []*store.Store
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasSuffix(entry.Name(), ".git") {
			continue
		}

		fileName := strings.TrimSuffix(entry.Name(), ".git")
		filePath := filepath.Join(cwd, fileName)

		s, err := store.NewStore(filePath)
		if err != nil || !s.Exists() {
			continue
		}

		stores = append(stores, s)
	}

	if len(stores) == 0 {
		return nil, fmt.Errorf("no tracked files found\nUse 'oops start <file>' to begin")
	}

	if len(stores) > 1 {
		return nil, fmt.Errorf("multiple tracked files found\nUse 'oops files' to see the list")
	}

	return stores[0], nil
}
