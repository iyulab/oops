package cmd

import (
	"strings"
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type result struct {
	code   int
	stdout string
	stderr string
}

func run(t *testing.T, args ...string) result {
	t.Helper()
	var out, errb bytes.Buffer
	code := Run(args, &out, &errb)
	return result{code, out.String(), errb.String()}
}

func jsonOf(t *testing.T, s string) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		t.Fatalf("not one JSON object: %v\n%s", err, s)
	}
	return m
}

func setup(t *testing.T) (store, file string) {
	t.Helper()
	dir := t.TempDir()
	file = filepath.Join(dir, "doc.txt")
	os.WriteFile(file, []byte("v1\n"), 0o644)
	return filepath.Join(dir, "st"), file
}

func TestSaveJSONAndUnchanged(t *testing.T) {
	st, f := setup(t)
	r := run(t, "--store", st, "--json", "save", f, "first draft", "--meta", "k=v")
	if r.code != 0 {
		t.Fatalf("exit %d: %s %s", r.code, r.stdout, r.stderr)
	}
	m := jsonOf(t, r.stdout)
	v := m["version"].(map[string]any)
	if m["saved"] != true || v["label"] != "first draft" || v["kind"] != "manual" || v["meta"].(map[string]any)["k"] != "v" {
		t.Fatalf("%v", m)
	}
	r = run(t, "--store", st, "--json", "save", f)
	if r.code != 0 || jsonOf(t, r.stdout)["reason"] != "unchanged" {
		t.Fatalf("unchanged: %d %s", r.code, r.stdout)
	}
}

func TestAutoActorAndHistoryFilter(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	os.WriteFile(f, []byte("v2\n"), 0o644)
	run(t, "--store", st, "save", f, "--auto", "--actor", "sync", "--meta", "batch=9")
	r := run(t, "--store", st, "--json", "history", f, "--where", "batch=9")
	vs := jsonOf(t, r.stdout)["versions"].([]any)
	if r.code != 0 || len(vs) != 1 || vs[0].(map[string]any)["actor"] != "sync" {
		t.Fatalf("%d %s", r.code, r.stdout)
	}
	r = run(t, "--store", st, "--json", "history", f, "--kind", "manual")
	if len(jsonOf(t, r.stdout)["versions"].([]any)) != 1 {
		t.Fatalf("kind filter: %s", r.stdout)
	}
}

func TestExitCodes(t *testing.T) {
	st, f := setup(t)
	cases := []struct {
		args  []string
		code  int
		ecode string
	}{
		{[]string{"history", f}, 3, "not_tracked"},
		{[]string{"save", filepath.Join(filepath.Dir(f), "missing.txt")}, 6, "file_not_found"},
		{[]string{"cat", f, "notanumber"}, 2, "usage"},
		{[]string{"save"}, 2, "usage"},
		{[]string{"save", f, "--no-such-flag"}, 2, "usage"},
	}
	for _, c := range cases {
		r := run(t, append([]string{"--store", st, "--json"}, c.args...)...)
		if r.code != c.code {
			t.Errorf("%v: exit %d want %d (%s)", c.args, r.code, c.code, r.stdout)
			continue
		}
		e := jsonOf(t, r.stdout)["error"].(map[string]any)
		if e["code"] != c.ecode {
			t.Errorf("%v: code %v want %s", c.args, e["code"], c.ecode)
		}
	}
	run(t, "--store", st, "save", f)
	if r := run(t, "--store", st, "--json", "cat", f, "5"); r.code != 4 {
		t.Errorf("version not found: exit %d", r.code)
	}
}

func TestHumanFailureIsNonZero(t *testing.T) {
	st, f := setup(t)
	r := run(t, "--store", st, "history", f)
	if r.code == 0 || r.stderr == "" {
		t.Fatalf("a failure must exit non-zero with a message: %+v", r)
	}
}

func TestCatNowFiles(t *testing.T) {
	st, f := setup(t)
	run(t, "--store", st, "save", f)
	os.WriteFile(f, []byte("v2\n"), 0o644)
	if r := run(t, "--store", st, "cat", f, "1"); r.code != 0 || r.stdout != "v1\n" {
		t.Fatalf("cat: %+v", r)
	}
	out := filepath.Join(t.TempDir(), "copy.txt")
	if r := run(t, "--store", st, "--json", "cat", f, "1", "--out", out); r.code != 0 {
		t.Fatalf("cat --out: %+v", r)
	}
	if b, _ := os.ReadFile(out); string(b) != "v1\n" {
		t.Fatalf("out file: %q", b)
	}
	m := jsonOf(t, run(t, "--store", st, "--json", "now", f).stdout)
	if m["changed"] != true || m["latest"].(float64) != 1 {
		t.Fatalf("now: %v", m)
	}
	fs := jsonOf(t, run(t, "--store", st, "--json", "files").stdout)["files"].([]any)
	if len(fs) != 1 {
		t.Fatalf("files: %v", fs)
	}
}

func TestStoreFromEnvAndLocalDefault(t *testing.T) {
	st, f := setup(t)
	t.Setenv("OOPS_STORE", st)
	if r := run(t, "save", f); r.code != 0 {
		t.Fatalf("env store: %+v", r)
	}
	if _, err := os.Stat(filepath.Join(st, "files")); err != nil {
		t.Fatal("OOPS_STORE not used")
	}
	t.Setenv("OOPS_STORE", "")
	if r := run(t, "save", f); r.code != 0 {
		t.Fatalf("local: %+v", r)
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(f), ".oops", "files")); err != nil {
		t.Fatal("local store beside the file not used")
	}
}

func TestUnits(t *testing.T) {
	if d, err := parseAge("30d"); err != nil || d.Hours() != 720 {
		t.Fatal(d, err)
	}
	if n, err := parseSize("500MB"); err != nil || n != 500*1024*1024 {
		t.Fatal(n, err)
	}
	if _, err := parseSize("lots"); err == nil {
		t.Fatal("bad size accepted")
	}
	if _, err := parseMeta([]string{"novalue"}); err == nil {
		t.Fatal("bad meta accepted")
	}
}

func TestLocalSaveAddsStoreToExistingGitignore(t *testing.T) {
	_, f := setup(t)
	gi := filepath.Join(filepath.Dir(f), ".gitignore")
	os.WriteFile(gi, []byte("node_modules/\n"), 0o644)
	t.Setenv("OOPS_STORE", "")
	if r := run(t, "save", f); r.code != 0 {
		t.Fatalf("save: %+v", r)
	}
	if b, _ := os.ReadFile(gi); !bytes.Contains(b, []byte(".oops")) {
		t.Fatalf(".gitignore not updated: %q", b)
	}
}

func TestVersionAnswersInJSON(t *testing.T) {
	r := run(t, "--version", "--json")
	if r.code != 0 || jsonOf(t, r.stdout)["version"] != Version {
		t.Fatalf("exit %d: %q", r.code, r.stdout)
	}
	if r := run(t, "--version"); r.code != 0 || !strings.Contains(r.stdout, Version) {
		t.Fatalf("plain --version: %q", r.stdout)
	}
}
