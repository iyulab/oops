package store

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func newTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	dir := t.TempDir()
	s := Open(filepath.Join(dir, "store"))
	clock := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	s.now = func() time.Time { clock = clock.Add(time.Minute); return clock }
	return s, dir
}

func write(t *testing.T, p, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestSaveTracksImplicitlyAndSkipsUnchanged(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "one")
	r, err := s.Save(f, SaveOptions{Label: "first"})
	if err != nil || !r.Saved || r.Version.N != 1 || r.Version.Kind != KindManual {
		t.Fatalf("first save: %+v %v", r, err)
	}
	r, err = s.Save(f, SaveOptions{})
	if err != nil || r.Saved || r.Reason != "unchanged" || r.Version.N != 1 {
		t.Fatalf("unchanged save must succeed without a version: %+v %v", r, err)
	}
	write(t, f, "two")
	r, _ = s.Save(f, SaveOptions{Kind: KindAuto, Actor: "tool", Meta: map[string]string{"batch": "7"}})
	if !r.Saved || r.Version.N != 2 || r.Version.Kind != KindAuto || r.Version.Meta["batch"] != "7" {
		t.Fatalf("second save: %+v", r)
	}
}

func TestManyFilesInOneDirectory(t *testing.T) {
	s, dir := newTestStore(t)
	for _, n := range []string{"a.txt", "b.txt", "c.txt"} {
		write(t, filepath.Join(dir, n), n)
		if _, err := s.Save(filepath.Join(dir, n), SaveOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	ix, err := s.History(filepath.Join(dir, "b.txt"))
	if err != nil || len(ix.Versions) != 1 {
		t.Fatalf("history per file: %+v %v", ix, err)
	}
}

func TestHistoryAndContent(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	if _, err := s.History(f); CodeOf(err) != CodeNotTracked {
		t.Fatalf("want not_tracked, got %v", err)
	}
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	write(t, f, "v2")
	s.Save(f, SaveOptions{})
	b, err := s.Content(f, 1)
	if err != nil || string(b) != "v1" {
		t.Fatalf("content: %q %v", b, err)
	}
	if _, err := s.Content(f, 9); CodeOf(err) != CodeVersionNotFound {
		t.Fatalf("want version_not_found, got %v", err)
	}
}

func TestStatus(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	write(t, f, "v2")
	s.Save(f, SaveOptions{})
	write(t, f, "v1")
	st, err := s.Status(f)
	if err != nil || st.Latest != 2 || st.Current != 1 || st.Changed || !st.Exists {
		t.Fatalf("status matching v1: %+v %v", st, err)
	}
	write(t, f, "edited")
	st, _ = s.Status(f)
	if st.Current != 0 || !st.Changed {
		t.Fatalf("status edited: %+v", st)
	}
	os.Remove(f)
	st, _ = s.Status(f)
	if st.Exists {
		t.Fatalf("status deleted: %+v", st)
	}
}

func TestSaveMissingFile(t *testing.T) {
	s, dir := newTestStore(t)
	if _, err := s.Save(filepath.Join(dir, "nope.txt"), SaveOptions{}); CodeOf(err) != CodeFileNotFound {
		t.Fatalf("want file_not_found, got %v", err)
	}
}

func TestSaveEmptyFile(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "empty.txt")
	write(t, f, "")
	r, err := s.Save(f, SaveOptions{})
	if err != nil || !r.Saved {
		t.Fatalf("empty save: %+v %v", r, err)
	}
	b, err := s.Content(f, 1)
	if err != nil || len(b) != 0 {
		t.Fatalf("empty content: %q %v", b, err)
	}
}

func TestSaveUnicodeAndLongPath(t *testing.T) {
	s, dir := newTestStore(t)
	deep := dir
	for len(deep) < 280 {
		deep = filepath.Join(deep, "긴 폴더 이름 long folder")
	}
	f := filepath.Join(deep, "회의록 notes.md")
	write(t, f, "내용")
	if _, err := s.Save(f, SaveOptions{}); err != nil {
		t.Fatalf("save long unicode path: %v", err)
	}
	b, err := s.Content(f, 1)
	if err != nil || string(b) != "내용" {
		t.Fatalf("content: %q %v", b, err)
	}
	if runtime.GOOS == "windows" {
		if _, err := s.History(strings.ToUpper(f[:1]) + f[1:]); err != nil {
			t.Fatalf("drive-letter case variant: %v", err)
		}
	}
}
