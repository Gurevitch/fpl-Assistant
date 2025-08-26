package repository

import (
	"context"
	"fmt"
	"log"

	"bitbucket.org/Local/fpl-assistant/backend/internal/model"
	"github.com/jmoiron/sqlx"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newPostgresDB(ctx context.Context, username, password, host string, port int, database, sslMode string) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		host, port, username, password, database, sslMode,
	)

	// Optional: Verify low-level connection
	sqlxDB, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("❌ Failed to open with sqlx: %w", err)
	}
	if err = sqlxDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("❌ Ping failed: %w", err)
	}

	// Now use GORM
	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("❌ Failed to open with GORM: %w", err)
	}

	// Auto-migrate here
	if err := gormDB.AutoMigrate(
		&model.Team{},
		&model.Player{},
		&model.Gameweek{},
		&model.UserTeam{},
		&model.UserTeamPlayer{},
	); err != nil {
		return nil, fmt.Errorf("❌ AutoMigrate failed: %w", err)
	}

	log.Println("✅ PostgreSQL connected and migrated")
	return gormDB, nil
}
