package cmd

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

func parseAge(s string) (time.Duration, error) {
	if strings.HasSuffix(s, "d") {
		n, err := strconv.Atoi(strings.TrimSuffix(s, "d"))
		if err != nil || n < 0 {
			return 0, usage(fmt.Errorf("invalid age %q (use e.g. 30d, 12h)", s))
		}
		return time.Duration(n) * 24 * time.Hour, nil
	}
	d, err := time.ParseDuration(s)
	if err != nil || d < 0 {
		return 0, usage(fmt.Errorf("invalid age %q (use e.g. 30d, 12h)", s))
	}
	return d, nil
}

func parseSize(s string) (int64, error) {
	u := strings.ToUpper(strings.TrimSpace(s))
	mult := int64(1)
	for _, suf := range []struct {
		s string
		m int64
	}{{"GB", 1 << 30}, {"MB", 1 << 20}, {"KB", 1 << 10}, {"B", 1}} {
		if strings.HasSuffix(u, suf.s) {
			u, mult = strings.TrimSuffix(u, suf.s), suf.m
			break
		}
	}
	n, err := strconv.ParseInt(strings.TrimSpace(u), 10, 64)
	if err != nil || n < 0 {
		return 0, usage(fmt.Errorf("invalid size %q (use e.g. 500MB, 1GB)", s))
	}
	return n * mult, nil
}

func parseMeta(kv []string) (map[string]string, error) {
	if len(kv) == 0 {
		return nil, nil
	}
	m := map[string]string{}
	for _, p := range kv {
		k, v, ok := strings.Cut(p, "=")
		if !ok || k == "" {
			return nil, usage(fmt.Errorf("invalid metadata %q (use key=value)", p))
		}
		m[k] = v
	}
	return m, nil
}

func parseVersion(s string) (int, error) {
	n, err := strconv.Atoi(strings.TrimPrefix(s, "#"))
	if err != nil || n < 1 {
		return 0, usage(fmt.Errorf("invalid version %q", s))
	}
	return n, nil
}
