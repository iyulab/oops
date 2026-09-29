package store

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestRestoreKeepsUnsavedWork(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	write(t, f, "v2")
	s.Save(f, SaveOptions{})
	write(t, f, "unsaved")
	r, err := s.Restore(f, 1, SaveOptions{Actor: "tester"})
	if err != nil || r.Restored != 1 || r.SavedBefore == nil || r.SavedBefore.Kind != KindManual || r.SavedBefore.Actor != "tester" {
		t.Fatalf("restore: %+v %v", r, err)
	}
	if b, _ := os.ReadFile(f); string(b) != "v1" {
		t.Fatalf("file after restore: %q", b)
	}
	if b, _ := s.Content(f, r.SavedBefore.N); string(b) != "unsaved" {
		t.Fatalf("unsaved work lost: %q", b)
	}
	r, _ = s.Restore(f, 2, SaveOptions{})
	if r.SavedBefore != nil { // "v1" is already a version — nothing new to keep
		t.Fatalf("no safety version expected: %+v", r)
	}
}

func TestRestoreRecreatesDeletedFile(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "sub", "a.txt")
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	os.RemoveAll(filepath.Join(dir, "sub"))
	if _, err := s.Restore(f, 1, SaveOptions{}); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(f); string(b) != "v1" {
		t.Fatalf("recreated: %q", b)
	}
}

func TestRestoreUnknownVersion(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "a.txt")
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	if _, err := s.Restore(f, 7, SaveOptions{}); CodeOf(err) != CodeVersionNotFound {
		t.Fatalf("want version_not_found, got %v", err)
	}
}

func TestMoveCarriesHistory(t *testing.T) {
	s, dir := newTestStore(t)
	a, b := filepath.Join(dir, "a.txt"), filepath.Join(dir, "b.txt")
	write(t, a, "v1")
	s.Save(a, SaveOptions{})
	r, err := s.Move(a, b)
	if err != nil || !r.MovedFile {
		t.Fatalf("move: %+v %v", r, err)
	}
	if _, err := s.History(a); CodeOf(err) != CodeNotTracked {
		t.Fatal("old path still tracked")
	}
	ix, err := s.History(b)
	if err != nil || len(ix.Versions) != 1 || ix.Path != b {
		t.Fatalf("new path: %+v %v", ix, err)
	}
	// history-only move: the file was already moved by someone else
	c := filepath.Join(dir, "c.txt")
	os.Rename(b, c)
	r, err = s.Move(b, c)
	if err != nil || r.MovedFile {
		t.Fatalf("history-only move: %+v %v", r, err)
	}
	write(t, a, "x")
	s.Save(a, SaveOptions{})
	if _, err := s.Move(a, c); CodeOf(err) != CodeAlreadyTracked {
		t.Fatalf("want already_tracked, got %v", err)
	}
}

func TestRemoveFilesOrphans(t *testing.T) {
	s, dir := newTestStore(t)
	a, b := filepath.Join(dir, "a.txt"), filepath.Join(dir, "b.txt")
	write(t, a, "1")
	write(t, b, "2")
	s.Save(a, SaveOptions{})
	s.Save(b, SaveOptions{})
	os.Remove(b)
	orph, _ := s.Orphans()
	if len(orph) != 1 || orph[0].Path != b {
		t.Fatalf("orphans: %+v", orph)
	}
	if err := s.Remove(a); err != nil {
		t.Fatal(err)
	}
	files, _ := s.Files()
	if len(files) != 1 {
		t.Fatalf("files after remove: %d", len(files))
	}
	if err := s.Remove(a); CodeOf(err) != CodeNotTracked {
		t.Fatalf("second remove: %v", err)
	}
}

func TestConcurrentSaves(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "shared.txt")
	write(t, f, "seed")
	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			other := Open(s.Root) // separate Store value = separate lock handle, real clock
			if _, err := other.Save(f, SaveOptions{}); err != nil {
				errs <- err
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent save: %v", err)
	}
	ix, err := s.History(f)
	if err != nil || len(ix.Versions) != 1 || ix.Next != 2 {
		t.Fatalf("8 concurrent saves of one content must yield exactly one version: %+v %v", ix, err)
	}
}

func TestFailedRestoreOnUntrackedLeavesNoTraceAndMoveStillWorks(t *testing.T) {
	s, dir := newTestStore(t)
	u, m := filepath.Join(dir, "u.txt"), filepath.Join(dir, "m.txt")
	if _, err := s.Restore(u, 1, SaveOptions{}); CodeOf(err) != CodeNotTracked {
		t.Fatalf("restore untracked: %v", err)
	}
	if _, err := os.Stat(s.fileDir(u)); !os.IsNotExist(err) {
		t.Fatal("a failed restore left a directory for an untracked file")
	}
	write(t, m, "m")
	s.Save(m, SaveOptions{})
	if _, err := s.Move(m, u); err != nil {
		t.Fatalf("move: %v", err)
	}
	if ix, err := s.History(u); err != nil || len(ix.Versions) != 1 {
		t.Fatalf("history stranded: %+v %v", ix, err)
	}
}

func TestLocalStoreSurvivesFolderRename(t *testing.T) {
	root := t.TempDir()
	proj := filepath.Join(root, "proj")
	f := filepath.Join(proj, "k.txt")
	write(t, f, "k")
	if _, err := OpenLocal(proj).Save(f, SaveOptions{}); err != nil {
		t.Fatal(err)
	}
	moved := filepath.Join(root, "proj2")
	if err := os.Rename(proj, moved); err != nil {
		t.Fatal(err)
	}
	s := OpenLocal(moved)
	if ix, err := s.History(filepath.Join(moved, "k.txt")); err != nil || ix.Path != filepath.Join(moved, "k.txt") {
		t.Fatalf("history after folder rename: %+v %v", ix, err)
	}
	if orph, _ := s.Orphans(); len(orph) != 0 {
		t.Fatalf("a file next to its store reported missing: %+v", orph[0])
	}
}

func TestRestoreSafetyCopyIsNeverPruned(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "w.txt")
	write(t, f, "good")
	s.Save(f, SaveOptions{})
	write(t, f, "edits")
	r, _ := s.Restore(f, 1, SaveOptions{})
	if r.SavedBefore == nil || r.SavedBefore.Kind != KindManual {
		t.Fatalf("safety copy must be a saved version: %+v", r.SavedBefore)
	}
}

func TestRestoreOntoReadOnlyFile(t *testing.T) {
	s, dir := newTestStore(t)
	f := filepath.Join(dir, "ro.txt")
	write(t, f, "v1")
	s.Save(f, SaveOptions{})
	write(t, f, "v2")
	s.Save(f, SaveOptions{})
	if err := os.Chmod(f, 0o444); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(f, 0o644)
	if _, err := s.Restore(f, 1, SaveOptions{}); err != nil {
		t.Fatalf("restore onto read-only: %v", err)
	}
	if b, _ := os.ReadFile(f); string(b) != "v1" {
		t.Fatalf("content: %q", b)
	}
	if fi, _ := os.Stat(f); fi.Mode().Perm()&0o200 != 0 {
		t.Fatal("read-only attribute not kept")
	}
	if _, err := os.Stat(f + ".oops-tmp"); !os.IsNotExist(err) {
		t.Fatal("temp file left behind")
	}
}

func TestRestoreWritesThroughSymlink(t *testing.T) {
	s, dir := newTestStore(t)
	real, link := filepath.Join(dir, "real.txt"), filepath.Join(dir, "link.txt")
	write(t, real, "v1")
	if err := os.Symlink(real, link); err != nil {
		t.Skipf("symlinks unavailable here: %v", err)
	}
	s.Save(link, SaveOptions{})
	write(t, real, "v2")
	if _, err := s.Restore(link, 1, SaveOptions{}); err != nil {
		t.Fatal(err)
	}
	if fi, _ := os.Lstat(link); fi.Mode()&os.ModeSymlink == 0 {
		t.Fatal("restore replaced the symlink with a regular file")
	}
	if b, _ := os.ReadFile(real); string(b) != "v1" {
		t.Fatalf("target not restored: %q", b)
	}
}
