package cmd

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/cobra"
)

func (a *app) mvCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "mv <from> <to>",
		Short: "🚚 Move a file and keep its versions (or re-point them if it was already moved)",
		Args:  usageArgs(cobra.ExactArgs(2)),
		RunE: func(cmd *cobra.Command, args []string) error {
			root, err := a.explicitRoot()
			if err != nil {
				return err
			}
			if root == "" {
				from, err1 := filepath.Abs(args[0])
				to, err2 := filepath.Abs(args[1])
				if err1 != nil || err2 != nil || filepath.Dir(from) != filepath.Dir(to) {
					return usage(fmt.Errorf("moving across folders needs --store or --global (local versions live beside the file)"))
				}
			}
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			r, err := s.Move(args[0], args[1])
			if err != nil {
				return err
			}
			a.emit(r, func() { a.say("✓ %s → %s", r.From, r.To) })
			return nil
		},
	}
}
