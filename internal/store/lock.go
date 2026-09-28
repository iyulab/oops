package store

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/gofrs/flock"
)

// lockFile takes the per-file lock, waiting up to timeout.
func lockFile(dir string, timeout time.Duration) (func(), error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	fl := flock.New(filepath.Join(dir, ".lock"))
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	ok, err := fl.TryLockContext(ctx, 25*time.Millisecond)
	if err != nil && ctx.Err() == nil {
		return nil, err
	}
	if !ok {
		return nil, errf(CodeLockTimeout, "another oops process holds the lock (waited %s)", timeout)
	}
	return func() { fl.Unlock() }, nil
}
