package cmd

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/iyulab/oops/internal/diff"
	"github.com/spf13/cobra"
)

func (a *app) changesCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "changes <file> [from] [to]",
		Aliases: []string{"diff"},
		Short:   "🔍 Show what changed (file vs latest, file vs #from, or #from vs #to)",
		Args:    usageArgs(cobra.RangeArgs(1, 3)),
		RunE: func(cmd *cobra.Command, args []string) error {
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			ix, err := s.History(args[0])
			if err != nil {
				return err
			}
			from := ix.Latest().N
			to := 0 // 0 = the file on disk
			if len(args) >= 2 {
				if from, err = parseVersion(args[1]); err != nil {
					return err
				}
			}
			if len(args) == 3 {
				if to, err = parseVersion(args[2]); err != nil {
					return err
				}
			}
			oldB, err := s.Content(args[0], from)
			if err != nil {
				return err
			}
			var newB []byte
			if to == 0 {
				if newB, err = os.ReadFile(args[0]); err != nil && !errors.Is(err, fs.ErrNotExist) {
					return err
				}
			} else if newB, err = s.Content(args[0], to); err != nil {
				return err
			}
			text, bin := diff.Unified(filepath.Base(args[0]), oldB, newB)
			var toJSON any
			if to != 0 {
				toJSON = to
			}
			a.emit(map[string]any{"path": ix.Path, "from": from, "to": toJSON, "binary": bin, "diff": text}, func() {
				if text == "" {
					a.say("  No changes")
					return
				}
				fmt.Fprint(a.stdout, text)
			})
			return nil
		},
	}
}
