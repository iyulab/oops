package cmd

import (
	"github.com/iyulab/oops/internal/config"
	"github.com/spf13/cobra"
)

func (a *app) configCmd() *cobra.Command {
	var setGlobal, setLocal bool
	c := &cobra.Command{
		Use:   "config",
		Short: "⚙️ Manage configuration",
		Long: `View or modify oops configuration.

Configuration is stored in ~/.oops/config

Examples:
  oops config                    Show current config
  oops config --default-global   Set global as default mode
  oops config --default-local    Set local as default mode`,
		Args: usageArgs(cobra.NoArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}
			if setGlobal || setLocal {
				cfg.DefaultGlobal = setGlobal
				if err := cfg.Save(); err != nil {
					return err
				}
			}
			path, _ := config.GetConfigPath()
			a.emit(map[string]any{"configFile": path, "defaultGlobal": cfg.DefaultGlobal}, func() {
				a.say("⚙️ Oops Configuration: %s", path)
				a.say("  default_global = %v", cfg.DefaultGlobal)
			})
			return nil
		},
	}
	c.Flags().BoolVar(&setGlobal, "default-global", false, "Set global as default storage mode")
	c.Flags().BoolVar(&setLocal, "default-local", false, "Set local as default storage mode")
	c.MarkFlagsMutuallyExclusive("default-global", "default-local")
	return c
}
