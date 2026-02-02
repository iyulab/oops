package updater

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	GitHubRepo   = "iyulab/oops"
	GitHubAPIURL = "https://api.github.com/repos/" + GitHubRepo + "/releases/latest"
)

// Release represents a GitHub release
type Release struct {
	TagName string  `json:"tag_name"`
	Assets  []Asset `json:"assets"`
	HTMLURL string  `json:"html_url"`
}

// Asset represents a release asset
type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// CheckForUpdate checks if a newer version is available
func CheckForUpdate(currentVersion string) (*Release, bool, error) {
	release, err := getLatestRelease()
	if err != nil {
		return nil, false, err
	}

	// Compare versions (strip 'v' prefix if present)
	latestVersion := strings.TrimPrefix(release.TagName, "v")
	currentVersion = strings.TrimPrefix(currentVersion, "v")

	if latestVersion != currentVersion && latestVersion > currentVersion {
		return release, true, nil
	}

	return release, false, nil
}

// getLatestRelease fetches the latest release from GitHub
func getLatestRelease() (*Release, error) {
	req, err := http.NewRequest("GET", GitHubAPIURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "oops-updater")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to check for updates: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("no releases found")
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API error: %s", resp.Status)
	}

	var release Release
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release info: %v", err)
	}

	return &release, nil
}

// GetAssetName returns the expected asset name for current OS/arch
func GetAssetName() string {
	os := runtime.GOOS
	arch := runtime.GOARCH

	var ext string
	if os == "windows" {
		ext = ".zip"
	} else {
		ext = ".tar.gz"
	}

	return fmt.Sprintf("oops-%s-%s%s", os, arch, ext)
}

// FindAsset finds the appropriate asset for current platform
func FindAsset(release *Release) *Asset {
	expectedName := GetAssetName()

	for _, asset := range release.Assets {
		if asset.Name == expectedName {
			return &asset
		}
	}

	// Try alternative naming
	altNames := []string{
		fmt.Sprintf("oops_%s_%s", runtime.GOOS, runtime.GOARCH),
		fmt.Sprintf("oops-%s-%s", runtime.GOOS, runtime.GOARCH),
	}

	for _, asset := range release.Assets {
		for _, alt := range altNames {
			if strings.Contains(asset.Name, alt) {
				return &asset
			}
		}
	}

	return nil
}

// DownloadAndInstall downloads and installs the update
func DownloadAndInstall(asset *Asset) error {
	// Get current executable path
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %v", err)
	}
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return fmt.Errorf("failed to resolve executable path: %v", err)
	}

	// Download the asset
	resp, err := http.Get(asset.BrowserDownloadURL)
	if err != nil {
		return fmt.Errorf("failed to download update: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download failed: %s", resp.Status)
	}

	// Create temp file
	tmpFile, err := os.CreateTemp("", "oops-update-*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to save update: %v", err)
	}
	tmpFile.Close()

	// Extract the binary
	var newBinary string
	if strings.HasSuffix(asset.Name, ".zip") {
		newBinary, err = extractZip(tmpFile.Name())
	} else if strings.HasSuffix(asset.Name, ".tar.gz") {
		newBinary, err = extractTarGz(tmpFile.Name())
	} else {
		// Assume it's a direct binary
		newBinary = tmpFile.Name()
	}

	if err != nil {
		return fmt.Errorf("failed to extract update: %v", err)
	}
	defer os.Remove(newBinary)

	// Replace the current executable
	// On Windows, we need to rename the old one first
	if runtime.GOOS == "windows" {
		oldPath := execPath + ".old"
		os.Remove(oldPath) // Remove any existing .old file
		if err := os.Rename(execPath, oldPath); err != nil {
			return fmt.Errorf("failed to backup old version: %v", err)
		}
		defer os.Remove(oldPath)
	}

	// Copy new binary to exec path
	if err := copyFile(newBinary, execPath); err != nil {
		return fmt.Errorf("failed to install update: %v", err)
	}

	// Make executable on Unix
	if runtime.GOOS != "windows" {
		if err := os.Chmod(execPath, 0755); err != nil {
			return fmt.Errorf("failed to set permissions: %v", err)
		}
	}

	return nil
}

func extractZip(zipPath string) (string, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	for _, f := range r.File {
		if strings.Contains(f.Name, "oops") && !f.FileInfo().IsDir() {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			defer rc.Close()

			tmpFile, err := os.CreateTemp("", "oops-binary-*")
			if err != nil {
				return "", err
			}

			if _, err := io.Copy(tmpFile, rc); err != nil {
				tmpFile.Close()
				return "", err
			}
			tmpFile.Close()

			return tmpFile.Name(), nil
		}
	}

	return "", fmt.Errorf("binary not found in archive")
}

func extractTarGz(tarGzPath string) (string, error) {
	f, err := os.Open(tarGzPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return "", err
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}

		if strings.Contains(header.Name, "oops") && header.Typeflag == tar.TypeReg {
			tmpFile, err := os.CreateTemp("", "oops-binary-*")
			if err != nil {
				return "", err
			}

			if _, err := io.Copy(tmpFile, tr); err != nil {
				tmpFile.Close()
				return "", err
			}
			tmpFile.Close()

			return tmpFile.Name(), nil
		}
	}

	return "", fmt.Errorf("binary not found in archive")
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}
