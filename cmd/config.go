package cmd

import (
	"fmt"

	"github.com/iyulab/oops/internal/config"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "⚙️ Manage configuration",
	Long: `View or modify oops configuration.

Configuration is stored in ~/.oops/config

Examples:
  oops config                    Show current config
  oops config --default-global   Set global as default mode
  oops config --default-local    Set local as default mode`,
	Args: cobra.NoArgs,
	RunE: runConfig,
}

var (
	setDefaultGlobal bool
	setDefaultLocal  bool
)

func runConfig(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		fail("Failed to load config: %v", err)
		return nil
	}

	// Handle set operations
	if setDefaultGlobal || setDefaultLocal {
		if setDefaultGlobal {
			cfg.DefaultGlobal = true
		} else if setDefaultLocal {
			cfg.DefaultGlobal = false
		}

		if err := cfg.Save(); err != nil {
			fail("Failed to save config: %v", err)
			return nil
		}

		if cfg.DefaultGlobal {
			success("Default mode set to: global")
		} else {
			success("Default mode set to: local")
		}
		return nil
	}

	// Show current config
	fmt.Println("⚙️ Oops Configuration:")
	fmt.Println()

	configPath, _ := config.GetConfigPath()
	fmt.Printf("  Config file: %s\n", configPath)
	fmt.Println()

	if cfg.DefaultGlobal {
		fmt.Println("  default_global = true")
		info("New files will be tracked globally by default")
		info("Use -l/--local to override")
	} else {
		fmt.Println("  default_global = false")
		info("New files will be tracked locally by default")
		info("Use -g/--global to override")
	}

	return nil
}

func init() {
	configCmd.Flags().BoolVar(&setDefaultGlobal, "default-global", false, "Set global as default storage mode")
	configCmd.Flags().BoolVar(&setDefaultLocal, "default-local", false, "Set local as default storage mode")
	rootCmd.AddCommand(configCmd)
}
