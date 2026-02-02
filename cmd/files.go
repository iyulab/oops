package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var filesAllFlag bool

var filesCmd = &cobra.Command{
	Use:     "files",
	Aliases: []string{"ls"},
	Short:   "📁 List tracked files",
	Long: `Show all files being tracked.

Examples:
  oops files      List locally tracked files
  oops files -g   List globally tracked files
  oops files -a   List both local and global tracked files`,
	Args: cobra.NoArgs,
	RunE: runFiles,
}

func runFiles(cmd *cobra.Command, args []string) error {
	if filesAllFlag {
		return runFilesAll()
	}
	if globalFlag {
		return runFilesGlobal()
	}
	return runFilesLocal()
}

func runFilesAll() error {
	hasLocal := false
	hasGlobal := false

	// Show local files first
	cwd, err := os.Getwd()
	if err == nil {
		oopsDir := filepath.Join(cwd, store.OopsDir)
		entries, err := os.ReadDir(oopsDir)
		if err == nil && len(entries) > 0 {
			var tracked []struct {
				name       string
				current    int
				latest     int
				hasChanges bool
			}

			for _, entry := range entries {
				if !entry.IsDir() || !strings.HasSuffix(entry.Name(), ".git") {
					continue
				}

				fileName := strings.TrimSuffix(entry.Name(), ".git")
				filePath := filepath.Join(cwd, fileName)

				s, err := store.NewStore(filePath)
				if err != nil || !s.Exists() {
					continue
				}

				current, latest, hasChanges, err := s.Now()
				if err != nil {
					continue
				}

				tracked = append(tracked, struct {
					name       string
					current    int
					latest     int
					hasChanges bool
				}{
					name:       fileName,
					current:    current,
					latest:     latest,
					hasChanges: hasChanges,
				})
			}

			if len(tracked) > 0 {
				hasLocal = true
				fmt.Println("📁 Local tracked files:")
				for _, t := range tracked {
					status := "✓"
					if t.hasChanges {
						status = "✏️"
					}

					versionInfo := fmt.Sprintf("#%d", t.current)
					if t.current != t.latest {
						versionInfo = fmt.Sprintf("#%d (latest #%d)", t.current, t.latest)
					}

					fmt.Printf("  %s %s  %s\n", status, t.name, versionInfo)
				}
			}
		}
	}

	// Show global files
	globalStores, err := store.ListGlobalStores()
	if err == nil && len(globalStores) > 0 {
		if hasLocal {
			fmt.Println()
		}
		hasGlobal = true
		fmt.Println("🌐 Globally tracked files:")
		for _, gInfo := range globalStores {
			s, err := store.NewGlobalStore(gInfo.FilePath)
			if err != nil || !s.Exists() {
				continue
			}

			current, latest, hasChanges, err := s.Now()
			if err != nil {
				continue
			}

			status := "✓"
			if hasChanges {
				status = "✏️"
			}

			if _, err := os.Stat(gInfo.FilePath); os.IsNotExist(err) {
				status = "?"
			}

			versionInfo := fmt.Sprintf("#%d", current)
			if current != latest {
				versionInfo = fmt.Sprintf("#%d (latest #%d)", current, latest)
			}

			fmt.Printf("  %s %s  %s\n", status, gInfo.FilePath, versionInfo)
		}
	}

	if !hasLocal && !hasGlobal {
		info("No tracked files")
		info("Use 'oops start <file>' to begin")
	}

	return nil
}

func runFilesLocal() error {
	cwd, err := os.Getwd()
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	oopsDir := filepath.Join(cwd, store.OopsDir)
	entries, err := os.ReadDir(oopsDir)
	if err != nil {
		if os.IsNotExist(err) {
			info("No tracked files")
			info("Use 'oops start <file>' to begin")
			return nil
		}
		fail("Error: %v", err)
		return nil
	}

	var tracked []struct {
		name       string
		current    int
		latest     int
		hasChanges bool
	}

	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasSuffix(entry.Name(), ".git") {
			continue
		}

		fileName := strings.TrimSuffix(entry.Name(), ".git")
		filePath := filepath.Join(cwd, fileName)

		s, err := store.NewStore(filePath)
		if err != nil || !s.Exists() {
			continue
		}

		current, latest, hasChanges, err := s.Now()
		if err != nil {
			continue
		}

		tracked = append(tracked, struct {
			name       string
			current    int
			latest     int
			hasChanges bool
		}{
			name:       fileName,
			current:    current,
			latest:     latest,
			hasChanges: hasChanges,
		})
	}

	if len(tracked) == 0 {
		info("No tracked files")
		info("Use 'oops start <file>' to begin")
		return nil
	}

	fmt.Println("📁 Tracked files:")
	for _, t := range tracked {
		status := "✓"
		if t.hasChanges {
			status = "✏️"
		}

		versionInfo := fmt.Sprintf("#%d", t.current)
		if t.current != t.latest {
			versionInfo = fmt.Sprintf("#%d (latest #%d)", t.current, t.latest)
		}

		fmt.Printf("  %s %s  %s\n", status, t.name, versionInfo)
	}

	return nil
}

func runFilesGlobal() error {
	globalStores, err := store.ListGlobalStores()
	if err != nil {
		fail("Error: %v", err)
		return nil
	}

	if len(globalStores) == 0 {
		info("No globally tracked files")
		info("Use 'oops start -g <file>' to begin")
		return nil
	}

	fmt.Println("🌐 Globally tracked files:")
	for _, info := range globalStores {
		s, err := store.NewGlobalStore(info.FilePath)
		if err != nil || !s.Exists() {
			continue
		}

		current, latest, hasChanges, err := s.Now()
		if err != nil {
			continue
		}

		status := "✓"
		if hasChanges {
			status = "✏️"
		}

		// Check if file still exists
		if _, err := os.Stat(info.FilePath); os.IsNotExist(err) {
			status = "?"
		}

		versionInfo := fmt.Sprintf("#%d", current)
		if current != latest {
			versionInfo = fmt.Sprintf("#%d (latest #%d)", current, latest)
		}

		fmt.Printf("  %s %s  %s\n", status, info.FilePath, versionInfo)
	}

	return nil
}

func init() {
	filesCmd.Flags().BoolVarP(&filesAllFlag, "all", "a", false, "Show both local and global tracked files")
	rootCmd.AddCommand(filesCmd)
}
