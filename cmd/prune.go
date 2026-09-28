package cmd

import (
	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

func (a *app) pruneCmd() *cobra.Command {
	var age, size string
	var dry bool
	c := &cobra.Command{
		Use:   "prune",
		Short: "🧹 Remove old automatic versions (saved versions are never removed)",
		Args:  usageArgs(cobra.NoArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			p := store.PrunePolicy{DryRun: dry}
			var err error
			if age != "" {
				if p.MaxAge, err = parseAge(age); err != nil {
					return err
				}
				if p.MaxAge == 0 {
					p.MaxAge = 1 // "0d": everything older than now
				}
			}
			if size != "" {
				if p.MaxBytes, err = parseSize(size); err != nil {
					return err
				}
			}
			s, err := a.storeHere()
			if err != nil {
				return err
			}
			r, err := s.Prune(p)
			if err != nil {
				return err
			}
			a.emit(r, func() {
				verb := "Removed"
				if r.DryRun {
					verb = "Would remove"
				}
				a.say("🧹 %s %d version(s), %d bytes; store now %d bytes", verb, len(r.Removed), r.FreedBytes, r.TotalBytes)
				if r.OverCapBytes > 0 {
					a.say("⚠ Still %d bytes over the limit — only saved versions remain", r.OverCapBytes)
				}
			})
			return nil
		},
	}
	c.Flags().StringVar(&age, "max-age", "", "Remove automatic versions older than this (e.g. 30d)")
	c.Flags().StringVar(&size, "max-size", "", "Keep the store under this size (e.g. 500MB)")
	c.Flags().BoolVar(&dry, "dry-run", false, "Report without removing anything")
	return c
}

func (a *app) gcCmd() *cobra.Command {
	var dry, yes bool
	c := &cobra.Command{
		Use:   "gc",
		Short: "🧹 Remove the versions of files that no longer exist",
		Args:  usageArgs(cobra.NoArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			s, err := a.storeHere()
			if err != nil {
				return err
			}
			orphans, err := s.Orphans()
			if err != nil {
				return err
			}
			paths := []string{}
			for _, ix := range orphans {
				paths = append(paths, ix.Path)
			}
			removed := []string{}
			if !dry && len(orphans) > 0 {
				ok, err := a.confirm(yes, "Remove the versions of these missing files?")
				if err != nil {
					return err
				}
				if ok {
					for _, ix := range orphans {
						if err := s.RemoveHistory(ix); err != nil {
							return err
						}
						removed = append(removed, ix.Path)
					}
				}
			}
			a.emit(map[string]any{"orphans": paths, "removed": removed, "dryRun": dry}, func() {
				for _, p := range paths {
					a.say("  - %s", p)
				}
				a.say("✓ Removed %d of %d", len(removed), len(paths))
			})
			return nil
		},
	}
	c.Flags().BoolVar(&dry, "dry-run", false, "List without removing")
	c.Flags().BoolVarP(&yes, "yes", "y", false, "Do not ask for confirmation")
	return c
}
