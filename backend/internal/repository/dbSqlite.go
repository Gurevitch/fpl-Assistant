package repository

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"bitbucket.org/Local/fpl-assistant/backend/internal/model"
	gormsqlite "gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newSQLiteDB(database string) (*gorm.DB, error) {
	ex, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("❌ failed to get executable directory: %w", err)
	}
	dbPath := filepath.Join(filepath.Dir(ex), database)

	// Ensure the parent directory exists
	dir := filepath.Dir(dbPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			return nil, fmt.Errorf("❌ failed to create directory for SQLite DB: %w", err)
		}
	}

	// Open GORM DB
	gormDB, err := gorm.Open(gormsqlite.Open(dbPath), &gorm.Config{Logger: logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Error,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)})
	if err != nil {
		return nil, fmt.Errorf("❌ failed to open with GORM: %w", err)
	}

	if err := gormDB.AutoMigrate(
		&model.Team{},
		&model.Player{},
		&model.Gameweek{},
		&model.Chip{},
		&model.UserTeam{},
		&model.UserTeamPlayer{},
	); err != nil {
		return nil, fmt.Errorf("❌ failed to auto-migrate: %w", err)
	}

	log.Println("✅ SQLite DB ready at", dbPath)
	return gormDB, nil
}
