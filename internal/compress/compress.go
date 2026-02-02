package compress

import (
	"bytes"
	"compress/gzip"
	"io"
	"path/filepath"
	"strings"
)

// Already compressed file extensions - compression would be ineffective
var compressedExtensions = map[string]bool{
	// Images
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	".webp": true, ".ico": true, ".bmp": true, ".tiff": true,
	".svg": true, // SVG is text but often already gzipped in transit

	// Video
	".mp4": true, ".mkv": true, ".avi": true, ".mov": true,
	".wmv": true, ".flv": true, ".webm": true, ".m4v": true,

	// Audio
	".mp3": true, ".m4a": true, ".aac": true, ".ogg": true,
	".flac": true, ".wma": true, ".opus": true,

	// Archives
	".zip": true, ".gz": true, ".7z": true, ".rar": true,
	".tar.gz": true, ".tgz": true, ".bz2": true, ".xz": true,
	".tar.bz2": true, ".tar.xz": true, ".lz": true, ".lzma": true,

	// Documents (already compressed internally)
	".pdf": true, ".docx": true, ".xlsx": true, ".pptx": true,
	".odt": true, ".ods": true, ".odp": true, ".epub": true,

	// Fonts
	".woff": true, ".woff2": true, ".eot": true, ".ttf": true,

	// Other
	".jar": true, ".war": true, ".apk": true, ".ipa": true,
	".deb": true, ".rpm": true, ".dmg": true,
}

// Text file extensions - definitely should compress
var textExtensions = map[string]bool{
	".txt": true, ".md": true, ".markdown": true,
	".json": true, ".xml": true, ".yaml": true, ".yml": true,
	".html": true, ".htm": true, ".css": true, ".js": true,
	".ts": true, ".tsx": true, ".jsx": true,
	".go": true, ".py": true, ".rb": true, ".java": true,
	".c": true, ".cpp": true, ".h": true, ".hpp": true,
	".cs": true, ".rs": true, ".swift": true, ".kt": true,
	".php": true, ".pl": true, ".sh": true, ".bash": true,
	".sql": true, ".graphql": true,
	".ini": true, ".conf": true, ".config": true,
	".log": true, ".csv": true, ".tsv": true,
}

// gzip magic number
var gzipMagic = []byte{0x1f, 0x8b}

// ShouldCompress determines if a file should be compressed
func ShouldCompress(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))

	// Check for double extensions like .tar.gz
	if strings.HasSuffix(strings.ToLower(filename), ".tar.gz") ||
		strings.HasSuffix(strings.ToLower(filename), ".tar.bz2") ||
		strings.HasSuffix(strings.ToLower(filename), ".tar.xz") {
		return false
	}

	// Already compressed - don't compress
	if compressedExtensions[ext] {
		return false
	}

	// Known text files - compress
	if textExtensions[ext] {
		return true
	}

	// Unknown extension - compress (most benefit for binary blobs)
	return true
}

// IsCompressed checks if data is gzip compressed
func IsCompressed(data []byte) bool {
	return len(data) >= 2 && bytes.Equal(data[:2], gzipMagic)
}

// Compress compresses data using gzip
func Compress(data []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)

	if _, err := w.Write(data); err != nil {
		return nil, err
	}

	if err := w.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// Decompress decompresses gzip data
func Decompress(data []byte) ([]byte, error) {
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer r.Close()

	return io.ReadAll(r)
}

// SmartCompress compresses if beneficial, returns original if compression doesn't help
func SmartCompress(data []byte, filename string) ([]byte, bool) {
	// Skip if already compressed or shouldn't compress
	if !ShouldCompress(filename) || IsCompressed(data) {
		return data, false
	}

	// Skip small files (< 1KB) - overhead not worth it
	if len(data) < 1024 {
		return data, false
	}

	compressed, err := Compress(data)
	if err != nil {
		return data, false
	}

	// Only use compressed if it's at least 10% smaller
	threshold := float64(len(data)) * 0.9
	if float64(len(compressed)) < threshold {
		return compressed, true
	}

	return data, false
}

// SmartDecompress decompresses if data is compressed
func SmartDecompress(data []byte) []byte {
	if !IsCompressed(data) {
		return data
	}

	decompressed, err := Decompress(data)
	if err != nil {
		return data // Return original if decompression fails
	}

	return decompressed
}
