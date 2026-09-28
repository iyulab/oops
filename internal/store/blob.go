package store

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"

	"github.com/iyulab/oops/internal/compress"
)

// HashBytes is the content address of data.
func HashBytes(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func blobPath(dir, hash string, gz bool) string {
	name := hash
	if gz {
		name += ".gz"
	}
	return filepath.Join(dir, "blobs", name)
}

// putBlob stores data under its hash; storing the same content twice is a no-op.
func putBlob(dir string, data []byte, gz bool) (string, error) {
	h := HashBytes(data)
	if _, err := os.Stat(blobPath(dir, h, false)); err == nil {
		return h, nil
	}
	if _, err := os.Stat(blobPath(dir, h, true)); err == nil {
		return h, nil
	}
	if err := os.MkdirAll(filepath.Join(dir, "blobs"), 0o755); err != nil {
		return "", err
	}
	body := data
	if gz {
		c, err := compress.Compress(data)
		if err != nil {
			return "", err
		}
		body = c
	}
	final := blobPath(dir, h, gz)
	tmp := final + ".tmp"
	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return "", err
	}
	return h, os.Rename(tmp, final)
}

func getBlob(dir, hash string) ([]byte, error) {
	if b, err := os.ReadFile(blobPath(dir, hash, false)); err == nil {
		return b, nil
	}
	b, err := os.ReadFile(blobPath(dir, hash, true))
	if errors.Is(err, os.ErrNotExist) {
		return nil, errf(CodeVersionNotFound, "content %s is missing from the store", hash[:12])
	}
	if err != nil {
		return nil, err
	}
	return compress.Decompress(b)
}

func blobDiskSize(dir, hash string) int64 {
	for _, gz := range []bool{false, true} {
		if fi, err := os.Stat(blobPath(dir, hash, gz)); err == nil {
			return fi.Size()
		}
	}
	return 0
}

func removeBlob(dir, hash string) {
	os.Remove(blobPath(dir, hash, false))
	os.Remove(blobPath(dir, hash, true))
}
