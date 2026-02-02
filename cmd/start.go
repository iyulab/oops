package cmd

import (
	"github.com/iyulab/oops/internal/store"
	"github.com/iyulab/oops/internal/utils"
	"github.com/spf13/cobra"
)

var startCmd = &cobra.Command{
	Use:     "start <file>",
	Aliases: []string{"track", "watch"},
	Short:   "👀 Start versioning a file",
	Long:    `Start tracking a file for versioning. Creates the first snapshot automatically.`,
	Args:    cobra.ExactArgs(1),
	RunE:    runStart,
}

func runStart(cmd *cobra.Command, args []string) error {
	filePath := args[0]

	if !utils.IsFile(filePath) {
		fail("'%s' is not a valid file", filePath)
		return nil
	}

	s, err := store.NewStoreWithOptions(filePath, store.StoreOptions{Global: globalFlag})
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	if s.Exists() {
		warn("'%s' is already being tracked", s.FileName)
		info("Use 'oops now' to see current status")
		return nil
	}

	// Check for duplicate tracking (file tracked in both local and global)
	hasLocal, hasGlobal := store.CheckDuplicateTracking(filePath)
	if globalFlag && hasLocal {
		warn("This file is already tracked locally (.oops/)")
		info("Consider using 'oops done' to stop local tracking first")
	} else if !globalFlag && hasGlobal {
		warn("This file is already tracked globally (~/.oops/)")
		info("Consider using 'oops done -g' to stop global tracking first")
	}

	if err := s.Initialize(); err != nil {
		fail("Failed to start tracking: %v", err)
		return nil
	}

	// Add to .gitignore if present (only for local mode)
	if !globalFlag {
		utils.EnsureGitignore(s.BaseDir)
	}

	if globalFlag {
		success("Now watching '%s' globally (snapshot #1)", s.FileName)
		info("Storage: %s", s.OopsDirPath())
	} else {
		success("Now watching '%s' (snapshot #1)", s.FileName)
	}
	info("Use 'oops save \"message\"' to save changes")
	return nil
}

func init() {
	rootCmd.AddCommand(startCmd)
}
