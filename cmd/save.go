package cmd

import (
	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

func (a *app) saveCmd() *cobra.Command {
	var auto bool
	var actor string
	var meta []string
	c := &cobra.Command{
		Use:     "save <file> [message]",
		Aliases: []string{"start", "track", "commit", "snap"},
		Short:   "📸 Save a version of a file (starts versioning it)",
		Args:    usageArgs(cobra.RangeArgs(1, 2)),
		RunE: func(cmd *cobra.Command, args []string) error {
			m, err := parseMeta(meta)
			if err != nil {
				return err
			}
			o := store.SaveOptions{Kind: store.KindManual, Actor: actor, Meta: m}
			if auto {
				o.Kind = store.KindAuto
			}
			if len(args) == 2 {
				o.Label = args[1]
			}
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			r, err := s.Save(args[0], o)
			if err != nil {
				return err
			}
			a.emit(r, func() {
				if !r.Saved {
					a.say("  No changes since #%d", r.Version.N)
					return
				}
				a.say("✓ Saved #%d %s", r.Version.N, r.Version.Label)
			})
			return nil
		},
	}
	c.Flags().BoolVar(&auto, "auto", false, "Mark as an automatic version (subject to prune)")
	c.Flags().StringVar(&actor, "actor", "", "Who made this version (free text)")
	c.Flags().StringArrayVar(&meta, "meta", nil, "Attach key=value metadata (repeatable)")
	return c
}
