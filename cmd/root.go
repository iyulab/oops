package cmd

import (
	"fmt"
	"os"

	"github.com/iyulab/oops/internal/config"
	"github.com/spf13/cobra"
)

var Version = "0.3.0"

// Global flags
var globalFlag bool
var localFlag bool // Explicit local flag to override config

var rootCmd = &cobra.Command{
	Use:     "oops",
	Short:   "Simple file versioning for everyone",
	Version: Version,
	Long: `Oops - Simple file versioning for everyone 🎯

Oops! Made a mistake? No worries - you can always go back!

Quick Start:
  oops start myfile.txt     👀 Start versioning
  oops save "first draft"   📸 Save a snapshot
  oops history              📜 View all snapshots
  oops back 1               ⏪ Go back to snapshot #1
  oops oops!                ↩️  Undo last change

For developers, Git-style aliases also work:
  track, commit, log, checkout, diff, status, untrack`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Apply config defaults if no explicit flag set
		if !globalFlag && !localFlag {
			cfg, _ := config.Load()
			if cfg != nil && cfg.DefaultGlobal {
				globalFlag = true
			}
		}
		// Explicit -l overrides config
		if localFlag {
			globalFlag = false
		}
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = true
	rootCmd.PersistentFlags().BoolVarP(&globalFlag, "global", "g", false, "Use global storage (~/.oops/) instead of local (.oops/)")
	rootCmd.PersistentFlags().BoolVarP(&localFlag, "local", "l", false, "Use local storage (.oops/) - overrides config default")
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
