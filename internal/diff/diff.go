// Package diff renders line diffs between two versions of a file.
package diff

import (
	"bytes"
	"unicode/utf8"

	"github.com/pmezard/go-difflib/difflib"
)

// IsBinary reports content that should not be shown as text.
func IsBinary(b []byte) bool {
	head := b
	if len(head) > 8000 {
		head = head[:8000]
		// do not judge a rune the cut split in two
		for i := len(head) - 1; i >= 0 && i >= len(head)-utf8.UTFMax; i-- {
			if utf8.RuneStart(head[i]) {
				if !utf8.FullRune(head[i:]) {
					head = head[:i]
				}
				break
			}
		}
	}
	return bytes.IndexByte(head, 0) >= 0 || !utf8.Valid(head)
}

// Unified returns a unified diff with 3 lines of context, "" when equal.
// The second result is true when either side is binary.
func Unified(name string, old, new []byte) (string, bool) {
	if bytes.Equal(old, new) {
		return "", false
	}
	if IsBinary(old) || IsBinary(new) {
		return "Binary files a/" + name + " and b/" + name + " differ\n", true
	}
	text, _ := difflib.GetUnifiedDiffString(difflib.UnifiedDiff{
		A: difflib.SplitLines(string(old)), B: difflib.SplitLines(string(new)),
		FromFile: "a/" + name, ToFile: "b/" + name, Context: 3,
	})
	return text, false
}
