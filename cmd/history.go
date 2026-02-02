package cmd

import (
	"fmt"
	"time"

	"github.com/spf13/cobra"
)

var historyCmd = &cobra.Command{
	Use:     "history",
	Aliases: []string{"log", "list"},
	Short:   "📜 View snapshot history",
	Long:    `Display all saved snapshots with their messages and timestamps.`,
	Args:    cobra.NoArgs,
	RunE:    runHistory,
}

func runHistory(cmd *cobra.Command, args []string) error {
	s, err := findTrackedStore()
	if err != nil {
		fail("%v", err)
		return nil
	}

	snapshots, err := s.History()
	if err != nil {
		fail("Failed to get history: %v", err)
		return nil
	}

	if len(snapshots) == 0 {
		info("No snapshots yet")
		return nil
	}

	current, _, _, _ := s.Now()

	fmt.Printf("📜 %s history:\n\n", s.FileName)

	for _, snap := range snapshots {
		marker := "  "
		if snap.Number == current {
			marker = "→ "
		}

		timeAgo := formatTimeAgo(snap.Timestamp)
		fmt.Printf("%s#%-3d  %-30s  %s\n", marker, snap.Number, snap.Message, timeAgo)
	}

	return nil
}

func formatTimeAgo(t time.Time) string {
	diff := time.Since(t)

	switch {
	case diff < time.Minute:
		return "just now"
	case diff < time.Hour:
		mins := int(diff.Minutes())
		if mins == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", mins)
	case diff < 24*time.Hour:
		hours := int(diff.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	case diff < 7*24*time.Hour:
		days := int(diff.Hours() / 24)
		if days == 1 {
			return "yesterday"
		}
		return fmt.Sprintf("%d days ago", days)
	default:
		return t.Format("Jan 2, 2006")
	}
}

func init() {
	rootCmd.AddCommand(historyCmd)
}
