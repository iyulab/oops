package store

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestCodeOf(t *testing.T) {
	err := &Error{Code: CodeNotTracked, Msg: "x"}
	if CodeOf(err) != CodeNotTracked {
		t.Fatal("code not recovered")
	}
	if CodeOf(errors.New("plain")) != "" {
		t.Fatal("plain error must have no code")
	}
}

func TestFileKeyStableAndShort(t *testing.T) {
	a := FileKey(filepath.Join(t.TempDir(), "a.txt"))
	if len(a) != 16 {
		t.Fatalf("key length %d", len(a))
	}
	p := filepath.Join(t.TempDir(), "b.txt")
	if FileKey(p) != FileKey(p) {
		t.Fatal("key not stable")
	}
}

func TestWindowsCaseInsensitiveKey(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("windows only")
	}
	if FileKey(`C:\Docs\Report.TXT`) != FileKey(`c:\docs\report.txt`) {
		t.Fatal("case variants must share a key on windows")
	}
}

func TestIndexRoundTripAndLookup(t *testing.T) {
	dir := t.TempDir()
	ix, err := loadIndex(dir)
	if err != nil || ix != nil {
		t.Fatalf("absent index: %v %v", ix, err)
	}
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	ix = &Index{Format: 2, Path: "/x/a.txt", Next: 3, Versions: []Version{
		{N: 1, Hash: "h1", Size: 1, Time: now, Kind: KindManual},
		{N: 2, Hash: "h2", Size: 2, Time: now, Kind: KindAuto, Actor: "tool", Meta: map[string]string{"k": "v"}},
	}}
	if err := ix.save(dir); err != nil {
		t.Fatal(err)
	}
	got, err := loadIndex(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got.Latest().N != 2 || got.Find(1).Hash != "h1" || got.Find(9) != nil || !got.HasHash("h2") {
		t.Fatalf("lookup wrong: %+v", got)
	}
	if got.Versions[1].Meta["k"] != "v" || got.Versions[1].Actor != "tool" {
		t.Fatal("fields lost")
	}
}

func TestIndexIgnoresStaleTemp(t *testing.T) {
	dir := t.TempDir()
	ix := &Index{Format: 2, Path: "/x", Next: 2, Versions: []Version{{N: 1, Hash: "h"}}}
	if err := ix.save(dir); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.json.tmp"), []byte("{garbage"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := loadIndex(dir)
	if err != nil || got.Latest().N != 1 {
		t.Fatalf("stale temp broke load: %v", err)
	}
	ix.Next = 3
	if err := ix.save(dir); err != nil {
		t.Fatalf("save over stale temp: %v", err)
	}
}

func TestBlobRoundTripCompressedAndPlain(t *testing.T) {
	dir := t.TempDir()
	data := []byte("hello hello hello hello")
	for _, gz := range []bool{false, true} {
		h, err := putBlob(dir, data, gz)
		if err != nil || h != HashBytes(data) {
			t.Fatalf("put: %v", err)
		}
		if _, err := putBlob(dir, data, gz); err != nil { // idempotent
			t.Fatal(err)
		}
		got, err := getBlob(dir, h)
		if err != nil || string(got) != string(data) {
			t.Fatalf("get: %v %q", err, got)
		}
		if blobDiskSize(dir, h) <= 0 {
			t.Fatal("size")
		}
		os.RemoveAll(filepath.Join(dir, "blobs"))
	}
}

func TestLockTimesOut(t *testing.T) {
	dir := t.TempDir()
	unlock, err := lockFile(dir, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer unlock()
	_, err = lockFile(dir, 150*time.Millisecond)
	if CodeOf(err) != CodeLockTimeout {
		t.Fatalf("want lock timeout, got %v", err)
	}
}
