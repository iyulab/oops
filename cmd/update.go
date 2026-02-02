package cmd

import (
	"fmt"

	"github.com/iyulab/oops/internal/updater"
	"github.com/spf13/cobra"
)

var checkOnly bool

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "🔄 Update oops to the latest version",
	Long: `Check for updates and optionally install the latest version.

Examples:
  oops update          Download and install the latest version
  oops update --check  Only check if an update is available`,
	Args: cobra.NoArgs,
	RunE: runUpdate,
}

func runUpdate(cmd *cobra.Command, args []string) error {
	info("Checking for updates...")

	release, hasUpdate, err := updater.CheckForUpdate(Version)
	if err != nil {
		fail("Failed to check for updates: %v", err)
		return nil
	}

	if !hasUpdate {
		success("You're running the latest version (v%s)", Version)
		return nil
	}

	fmt.Printf("\n")
	info("New version available: %s (current: v%s)", release.TagName, Version)
	info("Release: %s", release.HTMLURL)

	if checkOnly {
		fmt.Printf("\n")
		info("Run 'oops update' to install")
		return nil
	}

	// Find the right asset for this platform
	asset := updater.FindAsset(release)
	if asset == nil {
		fail("No download available for your platform")
		info("Please download manually from: %s", release.HTMLURL)
		return nil
	}

	fmt.Printf("\n")
	info("Downloading %s...", asset.Name)

	if err := updater.DownloadAndInstall(asset); err != nil {
		fail("Update failed: %v", err)
		info("Please download manually from: %s", release.HTMLURL)
		return nil
	}

	fmt.Printf("\n")
	success("Updated to %s!", release.TagName)
	info("Restart oops to use the new version")

	return nil
}

func init() {
	updateCmd.Flags().BoolVarP(&checkOnly, "check", "c", false, "Only check for updates, don't install")
	rootCmd.AddCommand(updateCmd)
}
