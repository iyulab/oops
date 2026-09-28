package main

import (
	"os"

	"github.com/iyulab/oops/cmd"
)

func main() {
	os.Exit(cmd.Run(os.Args[1:], os.Stdout, os.Stderr))
}
