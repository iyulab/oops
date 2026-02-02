package compress

import (
	"bytes"
	"testing"
)

func TestShouldCompress(t *testing.T) {
	tests := []struct {
		filename string
		expected bool
	}{
		// Text files - should compress
		{"file.txt", true},
		{"README.md", true},
		{"config.json", true},
		{"style.css", true},
		{"app.js", true},
		{"main.go", true},

		// Already compressed - should not compress
		{"image.jpg", false},
		{"photo.png", false},
		{"video.mp4", false},
		{"audio.mp3", false},
		{"archive.zip", false},
		{"archive.gz", false},
		{"archive.tar.gz", false},
		{"doc.pdf", false},
		{"doc.docx", false},

		// Unknown extension - should compress (conservative)
		{"file.xyz", true},
		{"data.bin", true},
	}

	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			result := ShouldCompress(tt.filename)
			if result != tt.expected {
				t.Errorf("ShouldCompress(%q) = %v, want %v", tt.filename, result, tt.expected)
			}
		})
	}
}

func TestCompressDecompress(t *testing.T) {
	original := []byte("Hello, World! This is a test string that should compress well if repeated. " +
		"Hello, World! This is a test string that should compress well if repeated. " +
		"Hello, World! This is a test string that should compress well if repeated.")

	compressed, err := Compress(original)
	if err != nil {
		t.Fatalf("Compress failed: %v", err)
	}

	// Should be smaller
	if len(compressed) >= len(original) {
		t.Logf("Warning: compressed size %d >= original %d", len(compressed), len(original))
	}

	decompressed, err := Decompress(compressed)
	if err != nil {
		t.Fatalf("Decompress failed: %v", err)
	}

	if !bytes.Equal(original, decompressed) {
		t.Error("Decompressed data doesn't match original")
	}
}

func TestIsCompressed(t *testing.T) {
	// Uncompressed data
	plain := []byte("Hello, World!")
	if IsCompressed(plain) {
		t.Error("Plain text should not be detected as compressed")
	}

	// Compressed data
	compressed, _ := Compress(plain)
	if !IsCompressed(compressed) {
		t.Error("Compressed data should be detected as compressed")
	}

	// Too short data
	short := []byte{0x1f}
	if IsCompressed(short) {
		t.Error("Single byte should not be detected as compressed")
	}
}

func TestSmartCompress(t *testing.T) {
	// Large compressible data
	largeText := bytes.Repeat([]byte("Hello World! "), 1000)
	result, wasCompressed := SmartCompress(largeText, "file.txt")

	if !wasCompressed {
		t.Error("Large text should be compressed")
	}
	if len(result) >= len(largeText) {
		t.Error("Compressed result should be smaller")
	}

	// Small data - should not compress
	smallText := []byte("Hi")
	result, wasCompressed = SmartCompress(smallText, "file.txt")

	if wasCompressed {
		t.Error("Small text should not be compressed")
	}
	if !bytes.Equal(result, smallText) {
		t.Error("Small text should be returned unchanged")
	}

	// Already compressed format - should not compress
	data := []byte("some data that looks like jpg content but isn't")
	result, wasCompressed = SmartCompress(data, "image.jpg")

	if wasCompressed {
		t.Error("JPG file should not be compressed")
	}
}

func TestSmartDecompress(t *testing.T) {
	original := bytes.Repeat([]byte("Test data "), 100)

	// Compressed data
	compressed, _ := Compress(original)
	result := SmartDecompress(compressed)
	if !bytes.Equal(result, original) {
		t.Error("SmartDecompress should decompress compressed data")
	}

	// Uncompressed data - should return as-is
	plain := []byte("Plain text")
	result = SmartDecompress(plain)
	if !bytes.Equal(result, plain) {
		t.Error("SmartDecompress should return uncompressed data unchanged")
	}
}

func TestCompressIncompressibleData(t *testing.T) {
	// Random-like data that doesn't compress well
	data := make([]byte, 2000)
	for i := range data {
		data[i] = byte(i * 17 % 256)
	}

	result, wasCompressed := SmartCompress(data, "random.bin")

	// Even if it doesn't compress well, should still work
	if wasCompressed {
		// Verify it can be decompressed
		decompressed := SmartDecompress(result)
		if !bytes.Equal(decompressed, data) {
			t.Error("Compressed data should decompress correctly")
		}
	} else {
		// Should return original
		if !bytes.Equal(result, data) {
			t.Error("Incompressible data should be returned unchanged")
		}
	}
}
