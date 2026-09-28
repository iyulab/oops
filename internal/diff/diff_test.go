package diff

import (
	"strings"
	"testing"
)

func TestUnifiedLines(t *testing.T) {
	out, bin := Unified("a.txt", []byte("one\ntwo\nthree\n"), []byte("one\n2\nthree\n"))
	if bin || !strings.Contains(out, "--- a/a.txt") || !strings.Contains(out, "-two") || !strings.Contains(out, "+2") ||
		!strings.Contains(out, "@@") {
		t.Fatalf("unexpected diff:\n%s", out)
	}
}

func TestUnifiedEqualIsEmpty(t *testing.T) {
	if out, _ := Unified("a", []byte("x"), []byte("x")); out != "" {
		t.Fatalf("%q", out)
	}
}

func TestUnifiedBinary(t *testing.T) {
	out, bin := Unified("img.png", []byte{0x89, 'P', 'N', 'G', 0, 1}, []byte{0x89, 'P', 'N', 'G', 0, 2})
	if !bin || out != "Binary files a/img.png and b/img.png differ\n" {
		t.Fatalf("%v %q", bin, out)
	}
}

func TestUnifiedFromEmpty(t *testing.T) {
	out, bin := Unified("n.txt", nil, []byte("hello\n"))
	if bin || !strings.Contains(out, "+hello") {
		t.Fatalf("%q", out)
	}
}

func TestLongUTF8TextIsNotBinary(t *testing.T) {
	text := []byte(strings.Repeat("가", 3000)) // 9000 bytes; byte 8000 falls inside a rune
	if IsBinary(text) {
		t.Fatal("long UTF-8 text cut mid-rune was taken for binary")
	}
}
