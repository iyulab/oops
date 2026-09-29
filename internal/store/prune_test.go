package store

import (
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func saveN(t *testing.T, s *Store, f string, kind Kind, contents ...string) {
	t.Helper()
	for _, c := range contents {
		write(t, f, c)
		if _, err := s.Save(f, SaveOptions{Kind: kind}); err != nil {
			t.Fatal(err)
		}
	}
}

func TestPruneWithoutPolicyRemovesNothing(t *testing.T) {
	s, dir := newTestStore(t)
	saveN(t, s, filepath.Join(dir, "a.txt"), KindAuto, "1", "2")
	r, err := s.Prune(PrunePolicy{})
	if err != nil || len(r.Removed) != 0 {
		t.Fatalf("%+v %v", r, err)
	}
}

func TestPruneByAgeKeepsManual(t *testing.T) {
	s, dir := newTestStore(t) // clock: +1 minute per save, starting 2026-01-01
	f := filepath.Join(dir, "a.txt")
	saveN(t, s, f, KindAuto, "1", "2")
	saveN(t, s, f, KindManual, "3")
	s.now = func() time.Time { return time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC) }
	r, err := s.Prune(PrunePolicy{MaxAge: 30 * 24 * time.Hour})
	if err != nil || len(r.Removed) != 2 || r.Removed[0].Reason != "age" { // newest (manual) stays anyway
		t.Fatalf("%+v %v", r, err)
	}
	ix, _ := s.History(f)
	if len(ix.Versions) != 1 || ix.Versions[0].Kind != KindManual {
		t.Fatalf("remaining: %+v", ix.Versions)
	}
}

func TestPruneBySizeEvictsBusiestFileFirstAndKeepsNewest(t *testing.T) {
	s, dir := newTestStore(t)
	hot, quiet := filepath.Join(dir, "hot.png"), filepath.Join(dir, "quiet.png")
	big := func(c string) string { return strings.Repeat(c, 1000) }
	saveN(t, s, quiet, KindAuto, big("q"))
	saveN(t, s, hot, KindAuto, big("1"), big("2"), big("3"), big("4"))
	r, err := s.Prune(PrunePolicy{MaxBytes: 2500})
	if len(r.Removed) != 3 {
		t.Fatalf("want the 3 older hot versions evicted: %+v", r)
	}
	if err != nil {
		t.Fatal(err)
	}
	for _, rm := range r.Removed {
		if rm.Path == quiet {
			t.Fatalf("quiet file's only version evicted: %+v", r)
		}
	}
	ix, _ := s.History(hot)
	if ix.Latest().N != 4 {
		t.Fatalf("hot file's newest version evicted: %+v", ix.Versions)
	}
	if r.TotalBytes > 2500 {
		t.Fatalf("still over cap: %+v", r)
	}
}

func TestPruneReportsOverCapWhenOnlyManualRemain(t *testing.T) {
	s, dir := newTestStore(t)
	saveN(t, s, filepath.Join(dir, "a.png"), KindManual, strings.Repeat("x", 3000))
	r, err := s.Prune(PrunePolicy{MaxBytes: 1000})
	if err != nil || len(r.Removed) != 0 || r.OverCapBytes <= 0 {
		t.Fatalf("%+v %v", r, err)
	}
}

func TestPruneDryRunChangesNothingAndIsIdempotent(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	saveN(t, s, f, KindAuto, "1", "2", "3")
	s.now = func() time.Time { return time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC) }
	dry, _ := s.Prune(PrunePolicy{MaxAge: time.Hour, DryRun: true})
	if ix, _ := s.History(f); len(ix.Versions) != 3 || len(dry.Removed) != 2 || !dry.DryRun {
		t.Fatalf("dry run: %+v", dry)
	}
	first, _ := s.Prune(PrunePolicy{MaxAge: time.Hour})
	second, _ := s.Prune(PrunePolicy{MaxAge: time.Hour})
	if len(first.Removed) != 2 || len(second.Removed) != 0 {
		t.Fatalf("idempotence: %+v / %+v", first, second)
	}
}

func TestAgePruneKeepsEachFilesNewestVersion(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "snap.txt")
	saveN(t, s, f, KindAuto, "1", "2", "3")
	s.now = func() time.Time { return time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC) }
	r, err := s.Prune(PrunePolicy{MaxAge: time.Hour})
	if err != nil || len(r.Removed) != 2 {
		t.Fatalf("%+v %v", r, err)
	}
	ix, err := s.History(f)
	if err != nil || len(ix.Versions) != 1 || ix.Versions[0].N != 3 {
		t.Fatalf("newest version must survive age pruning: %+v %v", ix, err)
	}
}
