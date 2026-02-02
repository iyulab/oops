package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/store"
)

// findTrackedStore finds a tracked file in the current directory or globally
func findTrackedStore() (*store.Store, error) {
	if globalFlag {
		return findGlobalTrackedStore()
	}
	return findLocalTrackedStore()
}

// findLocalTrackedStore finds a tracked file in the current directory
func findLocalTrackedStore() (*store.Store, error) {
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

// findGlobalTrackedStore finds a globally tracked file for the current directory
func findGlobalTrackedStore() (*store.Store, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}

	globalStores, err := store.ListGlobalStores()
	if err != nil {
		return nil, err
	}

	var matchingStores []*store.Store
	for _, info := range globalStores {
		// Check if this file is in the current directory
		if filepath.Dir(info.FilePath) == cwd {
			s, err := store.NewGlobalStore(info.FilePath)
			if err != nil || !s.Exists() {
				continue
			}
			matchingStores = append(matchingStores, s)
		}
	}

	if len(matchingStores) == 0 {
		return nil, fmt.Errorf("no globally tracked files found in this directory\nUse 'oops start -g <file>' to begin")
	}

	if len(matchingStores) > 1 {
		return nil, fmt.Errorf("multiple globally tracked files found\nUse 'oops files -g' to see the list")
	}

	return matchingStores[0], nil
}

// getStoreForFile returns a store for a specific file path
func getStoreForFile(filePath string) (*store.Store, error) {
	return store.NewStoreWithOptions(filePath, store.StoreOptions{Global: globalFlag})
}
