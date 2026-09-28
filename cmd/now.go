package cmd

import "github.com/spf13/cobra"

func (a *app) nowCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "now <file>",
		Aliases: []string{"status"},
		Short:   "ℹ️  Show whether the file matches a saved version",
		Args:    usageArgs(cobra.ExactArgs(1)),
		RunE: func(cmd *cobra.Command, args []string) error {
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			st, err := s.Status(args[0])
			if err != nil {
				return err
			}
			a.emit(st, func() {
				switch {
				case !st.Exists:
					a.say("⚠ %s is missing — 'oops back' can bring it back (latest #%d)", st.Path, st.Latest)
				case st.Changed:
					a.say("✏️  %s has unsaved changes (latest #%d)", st.Path, st.Latest)
				default:
					a.say("✓ %s is at #%d (latest #%d)", st.Path, st.Current, st.Latest)
				}
			})
			return nil
		},
	}
}
