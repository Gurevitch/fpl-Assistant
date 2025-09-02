package model

import "time"

type Fixture struct {
	// FPL fixture id
	ID int `gorm:"primaryKey"`

	// Gameweek (nullable in FPL for TBD fixtures)
	Event *int `gorm:"index"`

	// Kickoff (nullable)
	KickoffTime *time.Time

	// State
	Started              bool
	Finished             bool
	ProvisionalStartTime bool

	// Teams — FK to Team.ID (your existing Team table)
	TeamHID uint `gorm:"index;not null"` // home team
	TeamAID uint `gorm:"index;not null"` // away team

	// Scores (nullable until played)
	TeamHScore *int
	TeamAScore *int

	// Difficulty (FDR)
	TeamHDifficulty int `gorm:"not null"`
	TeamADifficulty int `gorm:"not null"`

	// Misc
	Minutes int
	PulseID int
	Code    int `gorm:"index"`

	// Optional relations (handy for Preload)
	TeamH *Team `gorm:"foreignKey:TeamHID;references:ID"`
	TeamA *Team `gorm:"foreignKey:TeamAID;references:ID"`
}
