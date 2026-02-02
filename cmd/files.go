package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

var filesCmd = &cobra.Command{
	Use:     "files",
	Aliases: []string{"ls"},
	Short:   "📁 List tracked files",
	Long:    `Show all files being tracked in the current directory.`,
	Args:    cobra.NoArgs,
	RunE:    runFiles,
}

func runFiles(cmd *cobra.Command, args []string) error {
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

func init() {
	rootCmd.AddCommand(filesCmd)
}
