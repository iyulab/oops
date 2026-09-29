package store

import (
	"os"
	"sort"
	"time"
)

// PrunePolicy limits what a store keeps. A zero field is no limit.
type PrunePolicy struct {
	MaxAge   time.Duration
	MaxBytes int64
	DryRun   bool
}

// RemovedVersion names a version prune removed (or would remove).
type RemovedVersion struct {
	Path   string `json:"path"`
	N      int    `json:"n"`
	Reason string `json:"reason"`
}

// PruneReport is the outcome of a prune.
type PruneReport struct {
	DryRun       bool             `json:"dryRun"`
	Removed      []RemovedVersion `json:"removed"`
	FreedBytes   int64            `json:"freedBytes"`
	TotalBytes   int64            `json:"totalBytes"`
	OverCapBytes int64            `json:"overCapBytes"`
}

type pruneFile struct {
	ix    *Index
	dir   string
	keep  map[int]bool     // version N -> still kept
	refs  map[string]int   // blob hash -> kept versions referencing it
	sizes map[string]int64 // blob hash -> bytes on disk
}

func (pf *pruneFile) remaining() []Version {
	var out []Version
	for _, v := range pf.ix.Versions {
		if pf.keep[v.N] {
			out = append(out, v)
		}
	}
	return out
}

// drop marks a version removed and returns the bytes that frees.
func (pf *pruneFile) drop(v Version) int64 {
	pf.keep[v.N] = false
	pf.refs[v.Hash]--
	if pf.refs[v.Hash] == 0 {
		return pf.sizes[v.Hash]
	}
	return 0
}

// Prune applies the retention policy to the whole store. Only auto versions are removed.
func (s *Store) Prune(p PrunePolicy) (PruneReport, error) {
	rep := PruneReport{DryRun: p.DryRun, Removed: []RemovedVersion{}}
	indexes, err := s.Files()
	if err != nil {
		return rep, err
	}
	var files []*pruneFile
	for _, ix := range indexes {
		pf := &pruneFile{ix: ix, dir: s.fileDir(ix.Path), keep: map[int]bool{}, refs: map[string]int{}, sizes: map[string]int64{}}
		for _, v := range ix.Versions {
			pf.keep[v.N] = true
			pf.refs[v.Hash]++
			if _, ok := pf.sizes[v.Hash]; !ok {
				pf.sizes[v.Hash] = blobDiskSize(pf.dir, v.Hash)
				rep.TotalBytes += pf.sizes[v.Hash]
			}
		}
		files = append(files, pf)
	}

	remove := func(pf *pruneFile, v Version, reason string) {
		freed := pf.drop(v)
		rep.FreedBytes += freed
		rep.TotalBytes -= freed
		rep.Removed = append(rep.Removed, RemovedVersion{Path: pf.ix.Path, N: v.N, Reason: reason})
	}

	if p.MaxAge > 0 {
		cutoff := s.now().Add(-p.MaxAge)
		for _, pf := range files {
			for i, v := range pf.ix.Versions {
				// a file's newest version is what it last looked like: age never removes it
				if i < len(pf.ix.Versions)-1 && v.Kind == KindAuto && v.Time.Before(cutoff) {
					remove(pf, v, "age")
				}
			}
		}
	}

	if p.MaxBytes > 0 {
		for rep.TotalBytes > p.MaxBytes {
			pf, v := pickEviction(files)
			if pf == nil {
				rep.OverCapBytes = rep.TotalBytes - p.MaxBytes
				break
			}
			remove(pf, v, "size")
		}
	}

	if p.DryRun {
		return rep, nil
	}
	for _, pf := range files {
		if err := s.applyPrune(pf); err != nil {
			return rep, err
		}
	}
	return rep, nil
}

// pickEviction: the oldest auto version of the file holding the most versions,
// never a file's newest remaining version while another candidate exists.
func pickEviction(files []*pruneFile) (*pruneFile, Version) {
	type cand struct {
		pf    *pruneFile
		v     Version
		count int
	}
	for _, allowNewest := range []bool{false, true} {
		var cands []cand
		for _, pf := range files {
			rem := pf.remaining()
			for i, v := range rem {
				if v.Kind != KindAuto || (!allowNewest && i == len(rem)-1) {
					continue
				}
				cands = append(cands, cand{pf, v, len(rem)})
				break // oldest eligible of this file
			}
		}
		if len(cands) == 0 {
			continue
		}
		sort.SliceStable(cands, func(i, j int) bool {
			if cands[i].count != cands[j].count {
				return cands[i].count > cands[j].count
			}
			return cands[i].v.Time.Before(cands[j].v.Time)
		})
		return cands[0].pf, cands[0].v
	}
	return nil, Version{}
}

func (s *Store) applyPrune(pf *pruneFile) error {
	changed := false
	for _, v := range pf.ix.Versions {
		if !pf.keep[v.N] {
			changed = true
			break
		}
	}
	if !changed {
		return nil
	}
	unlock, err := lockFile(pf.dir, s.LockTimeout)
	if err != nil {
		return err
	}
	fresh, err := s.loadIx(pf.dir) // re-read under the lock: a save may have landed meanwhile
	if err != nil || fresh == nil {
		unlock()
		return err
	}
	var kept []Version
	for _, v := range fresh.Versions {
		if keep, known := pf.keep[v.N]; !known || keep {
			kept = append(kept, v)
		}
	}
	fresh.Versions = kept
	if len(kept) == 0 {
		unlock()
		return os.RemoveAll(pf.dir)
	}
	if err := s.saveIx(fresh, pf.dir); err != nil {
		unlock()
		return err
	}
	for hash := range pf.refs {
		if !fresh.HasHash(hash) {
			removeBlob(pf.dir, hash)
		}
	}
	unlock()
	return nil
}
