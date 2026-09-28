package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

// confirm asks on the terminal unless yes is set; with --json it never asks.
func (a *app) confirm(yes bool, prompt string) (bool, error) {
	if yes {
		return true, nil
	}
	if a.json {
		return false, usage(fmt.Errorf("--yes is required with --json"))
	}
	fmt.Fprint(a.stdout, prompt+" [y/N]: ")
	line, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	line = strings.ToLower(strings.TrimSpace(line))
	return line == "y" || line == "yes", nil
}

func (a *app) doneCmd() *cobra.Command {
	var yes bool
	c := &cobra.Command{
		Use:     "done <file>",
		Aliases: []string{"untrack"},
		Short:   "🗑️  Stop versioning a file and delete its versions",
		Args:    usageArgs(cobra.ExactArgs(1)),
		RunE: func(cmd *cobra.Command, args []string) error {
			ok, err := a.confirm(yes, "Delete every saved version of "+args[0]+"?")
			if err != nil || !ok {
				return err
			}
			s, err := a.storeFor(args[0])
			if err != nil {
				return err
			}
			if err := s.Remove(args[0]); err != nil {
				return err
			}
			a.emit(map[string]any{"removed": args[0]}, func() { a.say("✓ Stopped versioning %s", args[0]) })
			return nil
		},
	}
	c.Flags().BoolVarP(&yes, "yes", "y", false, "Do not ask for confirmation")
	return c
}
