package cmd

import (
	"strings"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var saveCmd = &cobra.Command{
	Use:     "save [message]",
	Aliases: []string{"commit", "snap"},
	Short:   "📸 Save a snapshot",
	Long:    `Save the current state of the file as a new snapshot.`,
	Args:    cobra.MaximumNArgs(1),
	RunE:    runSave,
}

func runSave(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	message := ""
	if len(args) > 0 {
		message = strings.TrimSpace(args[0])
	}

	snapshot, err := s.Save(message)
	if err != nil {
		if err == store.ErrNoChanges {
			info("No changes to save")
			return nil
		}
		fail("Failed to save: %v", err)
		return nil
	}

	success("Snapshot #%d saved: %s", snapshot.Number, snapshot.Message)
	return nil
}

func init() {
	rootCmd.AddCommand(saveCmd)
}
