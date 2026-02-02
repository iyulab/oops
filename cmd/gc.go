package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var (
	gcDryRun bool
	gcYes    bool
)

var gcCmd = &cobra.Command{
	Use:   "gc",
	Short: "🧹 Clean up orphaned stores",
	Long: `Remove stores for files that no longer exist.

For global stores (-g), this removes tracking data for deleted files.
For local stores, this removes .oops entries for missing files.

Examples:
  oops gc -g          Clean orphaned global stores
  oops gc -g --dry-run  Preview what would be cleaned
  oops gc             Clean orphaned local stores`,
	Args: cobra.NoArgs,
	RunE: runGc,
}

func runGc(cmd *cobra.Command, args []string) error {
	if globalFlag {
		return runGcGlobal()
	}
	return runGcLocal()
}

func runGcLocal() error {
	cwd, err := os.Getwd()
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	oopsDir := cwd + string(os.PathSeparator) + store.OopsDir
	entries, err := os.ReadDir(oopsDir)
	if err != nil {
		if os.IsNotExist(err) {
			info("No .oops directory found")
			return nil
		}
		fail("Error: %v", err)
		return nil
	}

	var orphaned []string
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasSuffix(entry.Name(), ".git") {
			continue
		}

		fileName := strings.TrimSuffix(entry.Name(), ".git")
		filePath := cwd + string(os.PathSeparator) + fileName

		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			orphaned = append(orphaned, fileName)
		}
	}

	if len(orphaned) == 0 {
		success("No orphaned stores found")
		return nil
	}

	fmt.Printf("🧹 Found %d orphaned store(s):\n", len(orphaned))
	for _, name := range orphaned {
		fmt.Printf("  - %s\n", name)
	}

	if gcDryRun {
		info("Dry run - no changes made")
		return nil
	}

	if !gcYes {
		fmt.Print("\nRemove these stores? [y/N]: ")
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

	removed := 0
	for _, name := range orphaned {
		gitDir := oopsDir + string(os.PathSeparator) + name + ".git"
		if err := os.RemoveAll(gitDir); err != nil {
			warn("Failed to remove %s: %v", name, err)
		} else {
			removed++
		}
	}

	success("Removed %d orphaned store(s)", removed)
	return nil
}

func runGcGlobal() error {
	globalStores, err := store.ListGlobalStores()
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	if len(globalStores) == 0 {
		info("No global stores found")
		return nil
	}

	var orphaned []store.GlobalStoreInfo
	for _, info := range globalStores {
		if _, err := os.Stat(info.FilePath); os.IsNotExist(err) {
			orphaned = append(orphaned, info)
		}
	}

	if len(orphaned) == 0 {
		success("No orphaned global stores found")
		return nil
	}

	fmt.Printf("🧹 Found %d orphaned global store(s):\n", len(orphaned))
	for _, info := range orphaned {
		fmt.Printf("  - %s\n", info.FilePath)
	}

	if gcDryRun {
		info("Dry run - no changes made")
		return nil
	}

	if !gcYes {
		fmt.Print("\nRemove these stores? [y/N]: ")
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

	globalDir, _ := store.GetGlobalOopsDir()
	removed := 0
	for _, info := range orphaned {
		hashDir := globalDir + string(os.PathSeparator) + info.HashDir
		if err := os.RemoveAll(hashDir); err != nil {
			warn("Failed to remove %s: %v", info.FilePath, err)
		} else {
			removed++
		}
	}

	success("Removed %d orphaned global store(s)", removed)
	return nil
}

func init() {
	gcCmd.Flags().BoolVar(&gcDryRun, "dry-run", false, "Preview what would be cleaned without removing")
	gcCmd.Flags().BoolVarP(&gcYes, "yes", "y", false, "Skip confirmation")
	rootCmd.AddCommand(gcCmd)
}
