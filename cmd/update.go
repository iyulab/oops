package cmd

import (
	"fmt"

	"github.com/iyulab/oops/internal/updater"
	"github.com/spf13/cobra"
)

func (a *app) updateCmd() *cobra.Command {
	var checkOnly bool
	c := &cobra.Command{
		Use:   "update",
		Short: "🔄 Update oops to the latest version",
		Long: `Check for updates and optionally install the latest version.

Examples:
  oops update          Download and install the latest version
  oops update --check  Only check if an update is available`,
		Args: usageArgs(cobra.NoArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			release, hasUpdate, err := updater.CheckForUpdate(Version)
			if err != nil {
				return fmt.Errorf("failed to check for updates: %w", err)
			}
			if !hasUpdate {
				a.emit(map[string]any{"current": Version, "updateAvailable": false}, func() {
					a.say("✓ You're running the latest version (v%s)", Version)
				})
				return nil
			}
			if checkOnly {
				a.emit(map[string]any{"current": Version, "updateAvailable": true, "latest": release.TagName, "url": release.HTMLURL}, func() {
					a.say("  New version available: %s (current: v%s)", release.TagName, Version)
					a.say("  Run 'oops update' to install")
				})
				return nil
			}
			asset := updater.FindAsset(release)
			if asset == nil {
				return fmt.Errorf("no download for this platform; download it from %s", release.HTMLURL)
			}
			if err := updater.DownloadAndInstall(asset); err != nil {
				return fmt.Errorf("update failed (%v); download it from %s", err, release.HTMLURL)
			}
			a.emit(map[string]any{"updated": release.TagName}, func() {
				a.say("✓ Updated to %s — restart oops to use it", release.TagName)
			})
			return nil
		},
	}
	c.Flags().BoolVarP(&checkOnly, "check", "c", false, "Only check for updates, don't install")
	return c
}
