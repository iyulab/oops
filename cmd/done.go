package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

var yesDone bool

var doneCmd = &cobra.Command{
	Use:     "done",
	Aliases: []string{"untrack", "forget"},
	Short:   "🗑️ Stop versioning",
	Long:    `Stop tracking the file and remove all version history. This cannot be undone.`,
	Args:    cobra.NoArgs,
	RunE:    runDone,
}

func runDone(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	latest, _ := s.GetLatestVersion()

	if !yesDone {
		warn("This will delete all %d snapshots of '%s'", latest, s.FileName)
		fmt.Print("Are you sure? [y/N]: ")

		reader := bufio.NewReader(os.Stdin)
		response, err := reader.ReadString('\n')
		if err != nil {
			return nil
		}

		response = strings.TrimSpace(strings.ToLower(response))
		if response != "y" && response != "yes" {
			info("Cancelled")
			return nil
		}
	}

	if err := s.Delete(); err != nil {
		fail("Failed to stop tracking: %v", err)
		return nil
	}

	success("Stopped tracking '%s' (%d snapshots removed)", s.FileName, latest)
	return nil
}

func init() {
	doneCmd.Flags().BoolVarP(&yesDone, "yes", "y", false, "Skip confirmation")
	rootCmd.AddCommand(doneCmd)
}
