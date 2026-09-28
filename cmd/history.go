package cmd

import (
	"fmt"
	"time"

	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

func (a *app) historyCmd() *cobra.Command {
	var where []string
	var kind string
	c := &cobra.Command{
		Use:     "history <file>",
		Aliases: []string{"log", "list"},
		Short:   "📜 List the versions of a file",
		Args:    usageArgs(cobra.ExactArgs(1)),
		RunE: func(cmd *cobra.Command, args []string) error {
			filter, err := parseMeta(where)
			if err != nil {
				return err
			}
			if kind != "" && kind != string(store.KindManual) && kind != string(store.KindAuto) {
				return usage(fmt.Errorf("--kind must be manual or auto"))
			}
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			ix, err := s.History(args[0])
			if err != nil {
				return err
			}
			vs := []store.Version{}
			for _, v := range ix.Versions {
				if kind != "" && string(v.Kind) != kind {
					continue
				}
				match := true
				for k, want := range filter {
					if v.Meta[k] != want {
						match = false
					}
				}
				if match {
					vs = append(vs, v)
				}
			}
			a.emit(map[string]any{"path": ix.Path, "versions": vs}, func() {
				a.say("📜 %s", ix.Path)
				for _, v := range vs {
					label := v.Label
					if label == "" {
						label = fmt.Sprintf("Version #%d", v.N)
					}
					tag := ""
					if v.Kind == store.KindAuto {
						tag = " (auto)"
					}
					a.say("  #%-3d  %-32s  %s%s", v.N, label, formatTimeAgo(v.Time), tag)
				}
			})
			return nil
		},
	}
	c.Flags().StringArrayVar(&where, "where", nil, "Only versions whose metadata has key=value (repeatable)")
	c.Flags().StringVar(&kind, "kind", "", "Only manual or auto versions")
	return c
}

func formatTimeAgo(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		return plural(int(d.Minutes()), "minute")
	case d < 24*time.Hour:
		return plural(int(d.Hours()), "hour")
	case d < 7*24*time.Hour:
		return plural(int(d.Hours()/24), "day")
	}
	return t.Local().Format("2006-01-02")
}

func plural(n int, unit string) string {
	if n == 1 {
		return "1 " + unit + " ago"
	}
	return fmt.Sprintf("%d %ss ago", n, unit)
}
