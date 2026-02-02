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

	s, err := store.NewStore(filePath)
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	if s.Exists() {
		warn("'%s' is already being tracked", s.FileName)
		info("Use 'oops now' to see current status")
		return nil
	}

	if err := s.Initialize(); err != nil {
		fail("Failed to start tracking: %v", err)
		return nil
	}

	// Add to .gitignore if present
	utils.EnsureGitignore(s.BaseDir)

	success("Now watching '%s' (snapshot #1)", s.FileName)
	info("Use 'oops save \"message\"' to save changes")
	return nil
}

func init() {
	rootCmd.AddCommand(startCmd)
}
