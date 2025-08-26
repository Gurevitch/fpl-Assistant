package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

type Config struct {
	Database DatabaseConfig `toml:"database"`
}

type DatabaseConfig struct {
	Type string `toml:"type"` // "sqlite" or "postgres"
	// SQLite-specific
	Database string `toml:"database"` // e.g. "data/fpl.db"
	
	// Postgres-specific (optional for now)
	DBHost string `toml:"host"`
	DBPort int    `toml:"port"`
	DBUser string `toml:"user"`
	DBPass string `toml:"pass"`
	DBName string `toml:"name"`
	DBSSL  string `toml:"sslmode"`
}

func LoadConfig() *Config {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatalf("❌ Failed to resolve executable path: %v", err)
	}

	// Assume assets is next to the binary or under project root
	rootDir := filepath.Dir(exePath)
	configPath := filepath.Join(rootDir, "..", "..", "assets", "default.toml")

	// Fallback to CWD if not found
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Printf("⚠️  Not found at: %s, trying relative path...", configPath)
		configPath = "assets/default.toml"
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Fatalf("❌ Config file not found at %s", configPath)
	}

	var cfg Config
	if _, err := toml.DecodeFile(configPath, &cfg); err != nil {
		log.Fatalf("❌ Failed to parse config: %v", err)
	}

	log.Println("✅ Config loaded from", configPath)
	return &cfg
}

// Helper for repository connection
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.DBHost, d.DBPort, d.DBUser, d.DBPass, d.DBName, d.DBSSL,
	)
}
