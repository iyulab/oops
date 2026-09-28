package cmd

import (
	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

type fileEntry struct {
	Path     string         `json:"path"`
	Versions int            `json:"versions"`
	Latest   *store.Version `json:"latest"`
}

func (a *app) filesCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "files",
		Aliases: []string{"ls"},
		Short:   "📁 List versioned files in the store",
		Args:    usageArgs(cobra.NoArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			s, err := a.storeHere()
			if err != nil {
				return err
			}
			ixs, err := s.Files()
			if err != nil {
				return err
			}
			out := []fileEntry{}
			for _, ix := range ixs {
				out = append(out, fileEntry{Path: ix.Path, Versions: len(ix.Versions), Latest: ix.Latest()})
			}
			a.emit(map[string]any{"store": s.Root, "files": out}, func() {
				if len(out) == 0 {
					a.say("  No versioned files in %s", s.Root)
				}
				for _, f := range out {
					a.say("  %s  (%d versions)", f.Path, f.Versions)
				}
			})
			return nil
		},
	}
}
