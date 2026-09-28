package cmd

import (
	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

func (a *app) restore(file string, n int, actor string, meta []string) error {
	m, err := parseMeta(meta)
	if err != nil {
		return err
	}
	s, err := a.storeFor(file)
	if err != nil {
		return err
	}
	r, err := s.Restore(file, n, store.SaveOptions{Actor: actor, Meta: m})
	if err != nil {
		return err
	}
	a.emit(r, func() {
		if r.SavedBefore != nil {
			a.say("  Kept your unsaved changes as #%d", r.SavedBefore.N)
		}
		a.say("⏪ %s is back at #%d", r.Path, r.Restored)
	})
	return nil
}

func (a *app) backCmd() *cobra.Command {
	var actor string
	var meta []string
	c := &cobra.Command{
		Use:     "back <file> <version>",
		Aliases: []string{"checkout", "restore"},
		Short:   "⏪ Go back to a version (unsaved changes are kept as a version first)",
		Args:    usageArgs(cobra.ExactArgs(2)),
		RunE: func(cmd *cobra.Command, args []string) error {
			n, err := parseVersion(args[1])
			if err != nil {
				return err
			}
			return a.restore(args[0], n, actor, meta)
		},
	}
	c.Flags().StringVar(&actor, "actor", "", "Who is restoring (recorded on the safety version)")
	c.Flags().StringArrayVar(&meta, "meta", nil, "key=value metadata for the safety version (repeatable)")
	return c
}

func (a *app) undoCmd() *cobra.Command {
	var actor string
	c := &cobra.Command{
		Use:     "oops! <file>",
		Aliases: []string{"undo"},
		Short:   "↩️  Go back to the latest saved version",
		Args:    usageArgs(cobra.ExactArgs(1)),
		RunE: func(cmd *cobra.Command, args []string) error {
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			ix, err := s.History(args[0])
			if err != nil {
				return err
			}
			return a.restore(args[0], ix.Latest().N, actor, nil)
		},
	}
	c.Flags().StringVar(&actor, "actor", "", "Who is undoing")
	return c
}
