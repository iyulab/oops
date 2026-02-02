package cmd

import (
	"strconv"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var oopsBackCmd = &cobra.Command{
	Use:   "oops! [version]",
	Short: "↩️ Quick undo (go back one snapshot or to specific version)",
	Long: `Quick way to undo changes or go back.

Examples:
  oops oops!       Go back to previous snapshot
  oops oops! 2     Go to snapshot #2 (same as 'back 2')`,
	Args: cobra.MaximumNArgs(1),
	RunE: runOopsBack,
}

func runOopsBack(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	// If version specified, go to that version
	if len(args) > 0 {
		num, err := strconv.Atoi(args[0])
		if err != nil || num < 1 {
			fail("Invalid snapshot number: %s", args[0])
			return nil
		}
		return runBackToVersion(s, num)
	}

	// Otherwise, check if there are unsaved changes
	_, latest, hasChanges, err := s.Now()
	if err != nil {
		fail("%v", err)
		return nil
	}

	if hasChanges {
		// Undo unsaved changes (restore to HEAD)
		if err := s.Undo(); err != nil {
			fail("Failed to undo: %v", err)
			return nil
		}
		success("Undid unsaved changes")
		return nil
	}

	// Go to previous snapshot
	if latest <= 1 {
		info("Already at the first snapshot")
		return nil
	}

	return runBackToVersion(s, latest-1)
}

func runBackToVersion(s *store.Store, num int) error {
	if err := s.Back(num, true); err != nil {
		if err == store.ErrVersionNotFound {
			fail("Snapshot #%d not found", num)
			return nil
		}
		fail("Failed: %v", err)
		return nil
	}
	success("Went back to snapshot #%d", num)
	return nil
}

func init() {
	rootCmd.AddCommand(oopsBackCmd)
}
