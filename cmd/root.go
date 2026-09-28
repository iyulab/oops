package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/iyulab/oops/internal/config"
	"github.com/iyulab/oops/internal/store"
	"github.com/spf13/cobra"
)

// Version is the oops release.
var Version = "0.4.0"

type app struct {
	stdout, stderr io.Writer
	json           bool
	storeDir       string
	global, local  bool
	lockTimeout    time.Duration
}

// usageError marks a mistake in how oops was called (exit 2).
type usageError struct{ error }

func usage(err error) error { return usageError{err} }

func usageArgs(fn cobra.PositionalArgs) cobra.PositionalArgs {
	return func(c *cobra.Command, args []string) error {
		if err := fn(c, args); err != nil {
			return usage(err)
		}
		return nil
	}
}

func exitCode(err error) int {
	var u usageError
	if errors.As(err, &u) {
		return 2
	}
	switch store.CodeOf(err) {
	case store.CodeNotTracked:
		return 3
	case store.CodeVersionNotFound:
		return 4
	case store.CodeLockTimeout:
		return 5
	case store.CodeFileNotFound:
		return 6
	case store.CodeAlreadyTracked:
		return 7
	}
	return 1
}

func errorCode(err error) string {
	var u usageError
	if errors.As(err, &u) {
		return "usage"
	}
	if c := store.CodeOf(err); c != "" {
		return string(c)
	}
	return "error"
}

// Run executes oops with args and returns the process exit code.
func Run(args []string, stdout, stderr io.Writer) int {
	a := &app{stdout: stdout, stderr: stderr}
	root := a.newRootCmd()
	root.SetArgs(args)
	root.SetOut(stdout)
	root.SetErr(stderr)
	err := root.Execute()
	if err == nil {
		return 0
	}
	if a.json {
		json.NewEncoder(stdout).Encode(map[string]any{"error": map[string]string{"code": errorCode(err), "message": err.Error()}})
	} else {
		fmt.Fprintf(stderr, "✗ %v\n", err)
	}
	return exitCode(err)
}

func (a *app) newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:           "oops",
		Short:         "Simple file versioning for everyone",
		Version:       Version,
		SilenceErrors: true,
		SilenceUsage:  true,
		Long: `Oops - Simple file versioning for everyone 🎯

Oops! Made a mistake? No worries - you can always go back!

  oops save essay.txt "first draft"   📸 Save a version (starts versioning the file)
  oops history essay.txt              📜 List versions
  oops changes essay.txt 1            🔍 Compare with version #1
  oops back essay.txt 1               ⏪ Go back to version #1
  oops oops! essay.txt                ↩️  Undo unsaved changes`,
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			if !a.global && !a.local {
				if cfg, _ := config.Load(); cfg != nil && cfg.DefaultGlobal {
					a.global = true
				}
			}
			if a.local {
				a.global = false
			}
		},
	}
	root.CompletionOptions.DisableDefaultCmd = true
	root.SetFlagErrorFunc(func(c *cobra.Command, err error) error { return usage(err) })
	pf := root.PersistentFlags()
	pf.BoolVarP(&a.global, "global", "g", false, "Use global storage (~/.oops/)")
	pf.BoolVarP(&a.local, "local", "l", false, "Use local storage (.oops/ beside the file) - overrides config")
	pf.StringVar(&a.storeDir, "store", "", "Use this store directory (also: OOPS_STORE)")
	pf.BoolVar(&a.json, "json", false, "Print one JSON object (for scripts and applications)")
	pf.DurationVar(&a.lockTimeout, "lock-timeout", 10*time.Second, "How long to wait for another oops process")

	root.AddCommand(a.saveCmd(), a.historyCmd(), a.catCmd(), a.nowCmd(), a.filesCmd(), a.updateCmd(), a.configCmd())
	return root
}

func (a *app) open(root string) *store.Store {
	s := store.Open(root)
	s.LockTimeout = a.lockTimeout
	return s
}

func (a *app) explicitRoot() (string, error) {
	if a.storeDir != "" {
		return a.storeDir, nil
	}
	if env := os.Getenv("OOPS_STORE"); env != "" {
		return env, nil
	}
	if a.global {
		return store.GlobalRoot()
	}
	return "", nil
}

// storeFor is the store that holds file's history.
func (a *app) storeFor(file string) (*store.Store, error) {
	root, err := a.explicitRoot()
	if err != nil {
		return nil, err
	}
	if root == "" {
		abs, err := filepath.Abs(file)
		if err != nil {
			return nil, err
		}
		root = store.LocalRoot(abs)
	}
	return a.open(root), nil
}

// storeHere is the store a store-wide command works on.
func (a *app) storeHere() (*store.Store, error) {
	root, err := a.explicitRoot()
	if err != nil {
		return nil, err
	}
	if root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		root = filepath.Join(cwd, store.OopsDir)
	}
	return a.open(root), nil
}

// emit prints v as one JSON object with --json, otherwise runs human.
func (a *app) emit(v any, human func()) {
	if a.json {
		enc := json.NewEncoder(a.stdout)
		enc.SetIndent("", "  ")
		enc.Encode(v)
		return
	}
	human()
}

func (a *app) say(format string, args ...any) { fmt.Fprintf(a.stdout, format+"\n", args...) }
