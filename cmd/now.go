package cmd

import (
	"fmt"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var nowCmd = &cobra.Command{
	Use:     "now",
	Aliases: []string{"status", "info"},
	Short:   "ℹ️ Show current status",
	Long:    `Display the current tracking status including version and changes.`,
	Args:    cobra.NoArgs,
	RunE:    runNow,
}

func runNow(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	current, latest, hasChanges, err := s.Now()
	if err != nil {
		fail("Failed to get status: %v", err)
		return nil
	}

	fmt.Printf("📄 File:     %s\n", s.FileName)

	if s.Global {
		fmt.Printf("🌐 Mode:     Global (%s)\n", s.OopsDirPath())
	}

	if current == latest {
		fmt.Printf("📍 Snapshot: #%d (latest)\n", current)
	} else {
		fmt.Printf("📍 Snapshot: #%d (latest is #%d)\n", current, latest)
	}

	if hasChanges {
		fmt.Printf("✏️  Status:   Modified\n")
		fmt.Println()
		info("You have unsaved changes")
		info("  oops save    Save your changes")
		info("  oops oops!   Undo changes")
	} else {
		fmt.Printf("✓  Status:   Clean\n")
	}

	// Check for duplicate tracking
	hasLocal, hasGlobal := store.CheckDuplicateTracking(s.FilePath)
	if hasLocal && hasGlobal {
		fmt.Println()
		warn("This file is tracked in both local and global storage!")
		info("  oops done      Stop local tracking")
		info("  oops done -g   Stop global tracking")
	}

	return nil
}

func init() {
	rootCmd.AddCommand(nowCmd)
}
