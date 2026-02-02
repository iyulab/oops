package cmd

import (
	"strconv"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var forceBack bool

var backCmd = &cobra.Command{
	Use:     "back <version>",
	Aliases: []string{"checkout", "goto"},
	Short:   "⏪ Go back to a specific snapshot",
	Long: `Restore the file to a previous snapshot.

Examples:
  oops back 1      Go to snapshot #1
  oops back 3      Go to snapshot #3
  oops back -f 1   Force (discard unsaved changes)`,
	Args: cobra.ExactArgs(1),
	RunE: runBack,
}

func runBack(cmd *cobra.Command, args []string) error {
	num, err := strconv.Atoi(args[0])
	if err != nil || num < 1 {
		fail("Invalid snapshot number: %s", args[0])
		return nil
	}

	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	if err := s.Back(num, forceBack); err != nil {
		if err == store.ErrVersionNotFound {
			fail("Snapshot #%d not found", num)
			info("Use 'oops history' to see available snapshots")
			return nil
		}
		if err == store.ErrUncommittedChanges {
			warn("You have unsaved changes")
			info("oops save     Save your changes first")
			info("oops back -f  Discard changes and go back")
			return nil
		}
		fail("Failed: %v", err)
		return nil
	}

	success("Restored to snapshot #%d", num)
	return nil
}

func init() {
	backCmd.Flags().BoolVarP(&forceBack, "force", "f", false, "Discard unsaved changes")
	rootCmd.AddCommand(backCmd)
}
