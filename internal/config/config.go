package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

const (
	ConfigFileName = "config"
)

// Config represents oops configuration
type Config struct {
	DefaultGlobal bool // Use global storage by default
}

// DefaultConfig returns default configuration
func DefaultConfig() *Config {
	return &Config{
		DefaultGlobal: false,
	}
}

// GetConfigDir returns the config directory path (~/.oops/)
func GetConfigDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(homeDir, ".oops"), nil
}

// GetConfigPath returns the config file path
func GetConfigPath() (string, error) {
	configDir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, ConfigFileName), nil
}

// Load reads configuration from ~/.oops/config
func Load() (*Config, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return DefaultConfig(), nil
	}

	file, err := os.Open(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultConfig(), nil
		}
		return nil, err
	}
	defer file.Close()

	cfg := DefaultConfig()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch key {
		case "default_global":
			cfg.DefaultGlobal = value == "true" || value == "1" || value == "yes"
		}
	}

	return cfg, scanner.Err()
}

// Save writes configuration to ~/.oops/config
func (c *Config) Save() error {
	configDir, err := GetConfigDir()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}

	configPath := filepath.Join(configDir, ConfigFileName)

	var lines []string
	lines = append(lines, "# Oops configuration file")
	lines = append(lines, "# default_global: Use global storage by default (true/false)")
	lines = append(lines, "")

	if c.DefaultGlobal {
		lines = append(lines, "default_global=true")
	} else {
		lines = append(lines, "default_global=false")
	}

	content := strings.Join(lines, "\n") + "\n"
	return os.WriteFile(configPath, []byte(content), 0644)
}
