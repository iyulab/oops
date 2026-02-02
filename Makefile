.PHONY: build test clean release

VERSION ?= 0.1.0
BINARY_NAME = oops
BUILD_DIR = build

build:
	go build -o $(BINARY_NAME) .

test:
	go test ./... -v

clean:
	rm -rf $(BUILD_DIR) $(BINARY_NAME) $(BINARY_NAME).exe

release: clean
	mkdir -p $(BUILD_DIR)
	# Windows
	GOOS=windows GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe .
	# Linux
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 .
	# macOS Intel
	GOOS=darwin GOARCH=amd64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 .
	# macOS Apple Silicon
	GOOS=darwin GOARCH=arm64 go build -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 .

install:
	go install .
