package store

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// An index left with no versions (a crash between writes, a hand edit) reads as "not tracked", never as a nil version.
func TestEmptyIndexIsNotTracked(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "one")
	if _, err := s.Save(f, SaveOptions{}); err != nil {
		t.Fatal(err)
	}
	abs, _ := filepath.Abs(f)
	d := s.fileDir(abs)
	ix, _ := s.loadIx(d)
	ix.Versions = nil
	if err := s.saveIx(ix, d); err != nil {
		t.Fatal(err)
	}
	if _, err := s.History(f); CodeOf(err) != CodeNotTracked {
		t.Fatalf("empty index: want not_tracked, got %v", err)
	}
	// and a new save starts a history again
	write(t, f, "two")
	if r, err := s.Save(f, SaveOptions{}); err != nil || !r.Saved {
		t.Fatalf("save after empty index: %+v %v", r, err)
	}
}

// An unreadable index is reported, not silently skipped.
func TestFilesReportsUnreadableIndex(t *testing.T) {
	s, dir := newTestStore(t)
	for _, n := range []string{"a.txt", "b.txt"} {
		f := filepath.Join(dir, n)
		write(t, f, n)
		if _, err := s.Save(f, SaveOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	abs, _ := filepath.Abs(filepath.Join(dir, "b.txt"))
	bad := s.fileDir(abs)
	os.WriteFile(filepath.Join(bad, "index.json"), []byte("{not json"), 0o644)

	ixs, unreadable, err := s.Files()
	if err != nil {
		t.Fatal(err)
	}
	if len(ixs) != 1 || len(unreadable) != 1 || unreadable[0].Dir != bad || unreadable[0].Error == "" {
		t.Fatalf("files=%d unreadable=%+v", len(ixs), unreadable)
	}
	rep, err := s.Prune(PrunePolicy{MaxBytes: 1})
	if err != nil || len(rep.Unreadable) != 1 {
		t.Fatalf("prune must report the unreadable index: %+v %v", rep, err)
	}
}

// Removing a history deletes its index before its blobs, so a reader never finds an index whose blobs are gone.
func TestRemoveHistoryDeletesIndexFirst(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "one")
	s.Save(f, SaveOptions{})
	abs, _ := filepath.Abs(f)
	d := s.fileDir(abs)
	var order []string
	s.beforeRemoveContent = func(dir string) {
		if _, err := os.Stat(filepath.Join(dir, "index.json")); err == nil {
			order = append(order, "index-still-there")
		}
	}
	ix, _ := s.History(f)
	if err := s.RemoveHistory(ix); err != nil {
		t.Fatal(err)
	}
	if len(order) != 0 {
		t.Fatalf("index.json was still present when the blobs were removed")
	}
	entries, _ := os.ReadDir(d)
	for _, e := range entries {
		if e.Name() != ".lock" {
			t.Fatalf("history content left behind: %s", e.Name())
		}
	}
	// the directory is reused: a later save starts a fresh history there
	if r, err := s.Save(f, SaveOptions{}); err != nil || !r.Saved || r.Version.N != 1 {
		t.Fatalf("save after remove: %+v %v", r, err)
	}
}

// Size eviction never removes an auto version whose content a saved (manual) version also holds: it frees nothing.
func TestSizeEvictionSkipsZeroGainVersions(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	// auto "big" (#1), then the same content saved by hand (#3) after a detour (#2)
	write(t, f, "big content that is shared")
	s.Save(f, SaveOptions{Kind: KindAuto})
	write(t, f, "detour")
	s.Save(f, SaveOptions{Kind: KindAuto})
	write(t, f, "big content that is shared")
	s.Save(f, SaveOptions{Kind: KindManual})
	g := filepath.Join(dir, "b.txt")
	saveN(t, s, g, KindAuto, "x1", "x2")

	rep, err := s.Prune(PrunePolicy{MaxBytes: 1, DryRun: true})
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range rep.Removed {
		if filepath.Base(r.Path) == "a.txt" && r.N == 1 {
			t.Fatalf("evicted a.txt #1, whose blob manual #3 keeps: %+v", rep.Removed)
		}
	}
}

// A prune that fails part way reports only what it actually removed.
func TestPruneReportCountsOnlyAppliedFiles(t *testing.T) {
	s, dir := newTestStore(t)
	a, b := filepath.Join(dir, "a.txt"), filepath.Join(dir, "b.txt")
	saveN(t, s, a, KindAuto, "a1", "a2", "a3")
	saveN(t, s, b, KindAuto, "b1", "b2", "b3")
	absB, _ := filepath.Abs(b)
	s.beforeApply = func(dir string) error {
		if dir == s.fileDir(absB) {
			return errf(CodeLockTimeout, "busy")
		}
		return nil
	}
	rep, err := s.Prune(PrunePolicy{MaxBytes: 1})
	if CodeOf(err) != CodeLockTimeout {
		t.Fatalf("want the lock error, got %v", err)
	}
	for _, r := range rep.Removed {
		if filepath.Base(r.Path) == "b.txt" {
			t.Fatalf("report claims b.txt removals that never happened: %+v", rep.Removed)
		}
	}
	// a.txt, applied first here, is reported; the store really lost those versions
	s.beforeApply = nil
	gone := 3 // every version gone: the size cap may evict a file's newest one too
	if ixA, err := s.History(a); err == nil {
		gone = 3 - len(ixA.Versions)
	} else if CodeOf(err) != CodeNotTracked {
		t.Fatal(err)
	}
	reported := 0
	for _, r := range rep.Removed {
		if filepath.Base(r.Path) == "a.txt" {
			reported++
		}
	}
	if reported != gone {
		t.Fatalf("a.txt: reported %d removals, store lost %d", reported, gone)
	}
}

// A case-only rename on a case-insensitive filesystem renames the file and keeps its history.
func TestMoveCaseOnlyRename(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("case-insensitive keys are Windows-only")
	}
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "r.txt")
	write(t, f, "one")
	s.Save(f, SaveOptions{})
	to := filepath.Join(dir, "R.txt")
	res, err := s.Move(f, to)
	if err != nil || !res.MovedFile {
		t.Fatalf("case rename: %+v %v", res, err)
	}
	entries, _ := os.ReadDir(dir)
	found := false
	for _, e := range entries {
		if e.Name() == "R.txt" {
			found = true
		}
	}
	if !found {
		t.Fatalf("file not renamed to R.txt: %v", entries)
	}
	ix, err := s.History(to)
	if err != nil || filepath.Base(ix.Path) != "R.txt" || len(ix.Versions) != 1 {
		t.Fatalf("history after case rename: %+v %v", ix, err)
	}
}

// A removed history leaves only its lock file; moving another file onto that path is not blocked by it.
func TestMoveOntoARemovedHistory(t *testing.T) {
	s, dir := newTestStore(t)
	old, other := filepath.Join(dir, "old.txt"), filepath.Join(dir, "other.txt")
	write(t, old, "one")
	s.Save(old, SaveOptions{})
	if err := s.Remove(old); err != nil {
		t.Fatal(err)
	}
	os.Remove(old)
	write(t, other, "two")
	s.Save(other, SaveOptions{})
	if _, err := s.Move(other, old); err != nil {
		t.Fatalf("move onto a removed history: %v", err)
	}
	if ix, err := s.History(old); err != nil || len(ix.Versions) != 1 {
		t.Fatalf("history after move: %+v %v", ix, err)
	}
}

// A move whose file cannot follow leaves the old history complete and nothing at the new path.
func TestFailedMoveKeepsTheOldHistory(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "one")
	s.Save(f, SaveOptions{})
	write(t, f, "two")
	s.Save(f, SaveOptions{})
	blocker := filepath.Join(dir, "blocker")
	write(t, blocker, "a file, so no directory can be made here")
	to := filepath.Join(blocker, "a.txt")
	if _, err := s.Move(f, to); err == nil {
		t.Fatal("move under a file must fail")
	}
	ix, err := s.History(f)
	if err != nil || len(ix.Versions) != 2 {
		t.Fatalf("old history after a failed move: %+v %v", ix, err)
	}
	for _, v := range ix.Versions {
		if _, err := s.Content(f, v.N); err != nil {
			t.Fatalf("version %d unreadable after a failed move: %v", v.N, err)
		}
	}
	if _, err := s.History(to); CodeOf(err) != CodeNotTracked {
		t.Fatalf("new path must not be tracked: %v", err)
	}
}
