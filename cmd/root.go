package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var Version = "0.2.0"

var rootCmd = &cobra.Command{
	Use:     "oops",
	Short:   "Simple file versioning for everyone",
	Version: Version,
	Long: `Oops - Simple file versioning for everyone 🎯

Oops! 실수해도 괜찮아요 - 언제든 되돌릴 수 있으니까!

Quick Start:
  oops start myfile.txt     👀 Start versioning
  oops save "first draft"   📸 Save a snapshot
  oops history              📜 View all snapshots
  oops back 1               ⏪ Go back to snapshot #1
  oops oops!                ↩️  Undo last change

For developers, Git-style aliases also work:
  track, commit, log, checkout, diff, status, untrack`,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}

// Helper for friendly output
func success(format string, args ...interface{}) {
	fmt.Printf("✓ "+format+"\n", args...)
}

func info(format string, args ...interface{}) {
	fmt.Printf("  "+format+"\n", args...)
}

func warn(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, "⚠ "+format+"\n", args...)
}

func fail(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, "✗ "+format+"\n", args...)
}
