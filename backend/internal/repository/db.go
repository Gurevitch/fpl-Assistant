package repository

import (
	"context"
	"log"

	"bitbucket.org/Local/fpl-assistant/backend/internal/config"
	_ "github.com/lib/pq"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(ctx context.Context, cfg *config.DatabaseConfig) {
	var db *gorm.DB
	var err error

	switch cfg.Type {
	case "sqlite":
		db, err = newSQLiteDB(cfg.Database)
	case "postgres":
		db, err = newPostgresDB(ctx,
			cfg.DBUser,
			cfg.DBPass,
			cfg.DBHost,
			cfg.DBPort,
			cfg.DBName,
			cfg.DBSSL,
		)
	default:
		log.Fatalf("❌ Unsupported database type: %s", cfg.Type)
	}

	if err != nil {
		log.Fatalf("❌ DB initialization failed: %v", err)
	}

	log.Printf("✅ Connected to %s and migrated successfully", cfg.Type)
	DB = db
}
