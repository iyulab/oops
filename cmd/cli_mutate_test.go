package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBackUndoAndChanges(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	os.WriteFile(f, []byte("v2\n"), 0o644)
	run(t, "--store", st, "save", f)
	os.WriteFile(f, []byte("scratch\n"), 0o644)

	r := run(t, "--store", st, "--json", "changes", f)
	m := jsonOf(t, r.stdout)
	if r.code != 0 || !strings.Contains(m["diff"].(string), "+scratch") || m["binary"] != false {
		t.Fatalf("changes vs latest: %s", r.stdout)
	}
	if d := jsonOf(t, run(t, "--store", st, "--json", "changes", f, "1", "2").stdout)["diff"].(string); !strings.Contains(d, "-v1") {
		t.Fatalf("changes 1 2: %s", d)
	}

	r = run(t, "--store", st, "--json", "back", f, "1", "--actor", "me")
	m = jsonOf(t, r.stdout)
	if r.code != 0 || m["restored"].(float64) != 1 || m["savedBefore"] == nil {
		t.Fatalf("back: %s", r.stdout)
	}
	if b, _ := os.ReadFile(f); string(b) != "v1\n" {
		t.Fatalf("after back: %q", b)
	}
	os.WriteFile(f, []byte("oops\n"), 0o644)
	if r := run(t, "--store", st, "oops!", f); r.code != 0 {
		t.Fatalf("undo: %+v", r)
	}
	if b, _ := os.ReadFile(f); string(b) != "scratch\n" { // latest version is the pre-restore safety copy (#3)
		t.Fatalf("undo restores the latest version: %q", b)
	}
}

func TestDoneNeedsYesInJSON(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	if r := run(t, "--store", st, "--json", "done", f); r.code != 2 {
		t.Fatalf("done without --yes in json must be a usage error: %+v", r)
	}
	if r := run(t, "--store", st, "--json", "done", f, "--yes"); r.code != 0 {
		t.Fatalf("done --yes: %+v", r)
	}
	if r := run(t, "--store", st, "history", f); r.code != 3 {
		t.Fatalf("history after done: %+v", r)
	}
}

func TestMvCommand(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	to := filepath.Join(filepath.Dir(f), "renamed.txt")
	r := run(t, "--store", st, "--json", "mv", f, to)
	if r.code != 0 || jsonOf(t, r.stdout)["movedFile"] != true {
		t.Fatalf("mv: %+v", r)
	}
	if r := run(t, "--store", st, "history", to); r.code != 0 {
		t.Fatalf("history at new path: %+v", r)
	}
	other := filepath.Join(t.TempDir(), "x.txt")
	if r := run(t, "--json", "mv", to, other); r.code != 2 { // no --store: local stores are per folder
		t.Fatalf("cross-folder mv without a store must be a usage error: %+v", r)
	}
}

func TestPruneAndGcCommands(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f, "--auto")
	os.WriteFile(f, []byte("v2\n"), 0o644)
	run(t, "--store", st, "save", f, "--auto")
	r := run(t, "--store", st, "--json", "prune", "--max-age", "0d", "--dry-run") // the newest stays
	m := jsonOf(t, r.stdout)
	if r.code != 0 || m["dryRun"] != true || len(m["removed"].([]any)) != 1 {
		t.Fatalf("prune dry run: %s", r.stdout)
	}
	if r := run(t, "--store", st, "--json", "prune", "--max-size", "lots"); r.code != 2 {
		t.Fatalf("bad size: %+v", r)
	}
	os.Remove(f)
	r = run(t, "--store", st, "--json", "gc", "--yes")
	if r.code != 0 || len(jsonOf(t, r.stdout)["removed"].([]any)) != 1 {
		t.Fatalf("gc: %s", r.stdout)
	}
}

func TestUpdateRefusedWhenBundled(t *testing.T) {
	t.Setenv("OOPS_NO_UPDATE", "1")
	if r := run(t, "--json", "update"); r.code == 0 {
		t.Fatalf("update must be refused: %+v", r)
	}
}

func TestJSONErrorsForUnknownCommandAndFlag(t *testing.T) {
	st, f := setup(t)
	for _, args := range [][]string{{"--json", "bogus"}, {"save", "--bogus", "--json", f}} {
		r := run(t, append([]string{"--store", st}, args...)...)
		if r.code != 2 || jsonOf(t, r.stdout)["error"].(map[string]any)["code"] != "usage" {
			t.Errorf("%v: exit %d, stdout %q", args, r.code, r.stdout)
		}
	}
}

func TestGcListsBeforeAsking(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	os.Remove(f)
	r := run(t, "--store", st, "gc") // stdin is empty: the answer is no
	list, ask := strings.Index(r.stdout, f), strings.Index(r.stdout, "[y/N]")
	if list < 0 || ask < 0 || list > ask {
		t.Fatalf("the missing files must be listed before the question:\n%s", r.stdout)
	}
}
