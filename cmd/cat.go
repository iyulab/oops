package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

func (a *app) catCmd() *cobra.Command {
	var out string
	c := &cobra.Command{
		Use:   "cat <file> <version>",
		Short: "📄 Print a version's content (or write it with --out)",
		Args:  usageArgs(cobra.ExactArgs(2)),
		RunE: func(cmd *cobra.Command, args []string) error {
			n, err := parseVersion(args[1])
			if err != nil {
				return err
			}
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			b, err := s.Content(args[0], n)
			if err != nil {
				return err
			}
			if out == "" {
				_, err = a.stdout.Write(b)
				return err
			}
			if err := os.WriteFile(out, b, 0o644); err != nil {
				return err
			}
			a.emit(map[string]any{"written": out, "version": n, "size": len(b)}, func() { a.say("✓ Wrote #%d to %s", n, out) })
			return nil
		},
	}
	c.Flags().StringVar(&out, "out", "", "Write the content to this path")
	return c
}
