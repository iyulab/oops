package store

import (
	"errors"
	"fmt"
)

// Code classifies an error so a caller can react without parsing text.
type Code string

const (
	CodeNotTracked      Code = "not_tracked"
	CodeVersionNotFound Code = "version_not_found"
	CodeFileNotFound    Code = "file_not_found"
	CodeLockTimeout     Code = "lock_timeout"
	CodeAlreadyTracked  Code = "already_tracked"
)

// Error is an error with a stable code.
type Error struct {
	Code Code
	Msg  string
}

func (e *Error) Error() string { return e.Msg }

func errf(code Code, format string, a ...any) error {
	return &Error{Code: code, Msg: fmt.Sprintf(format, a...)}
}

// CodeOf returns the code of err, or "" when err carries none.
func CodeOf(err error) Code {
	var e *Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}
