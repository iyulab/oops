package cmd

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"
)

var changesCmd = &cobra.Command{
	Use:     "changes [version1] [version2]",
	Aliases: []string{"diff", "show"},
	Short:   "🔍 See what changed",
	Long: `Show differences between versions.

Examples:
  oops changes         Show unsaved changes
  oops changes 1       Compare current with snapshot #1
  oops changes 1 3     Compare snapshot #1 with #3`,
	Args: cobra.MaximumNArgs(2),
	RunE: runChanges,
}

func runChanges(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	var versions []int
	for _, arg := range args {
		num, err := strconv.Atoi(arg)
		if err != nil || num < 1 {
			fail("Invalid snapshot number: %s", arg)
			return nil
		}
		versions = append(versions, num)
	}

	diff, err := s.Changes(versions...)
	if err != nil {
		fail("Failed to get changes: %v", err)
		return nil
	}

	if diff == "" {
		info("No changes")
		return nil
	}

	fmt.Println(diff)
	return nil
}

func init() {
	rootCmd.AddCommand(changesCmd)
}
