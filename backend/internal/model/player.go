package model

import (
	"time"
)

type Player struct {
	ID                uint    `gorm:"primaryKey"`
	FirstName         string  `gorm:"size:100;not null"`
	LastName          string  `gorm:"size:100;not null"`
	WebName           string  `gorm:"not null"`
	TeamID            uint    `gorm:"not null"`
	Position          string  `gorm:"size:10;not null"`
	StartPrice        float64 `gorm:"not null"`
	CurrentPrice      float64 `gorm:"not null"`
	SelectedByPercent float64 `gorm:"size:10"`
	TransfersIn       int
	TransfersInEvent  int
	TransfersOut      int
	TransfersOutEvent int
	EventPoints       int       `gorm:"not null" json:"event_points"`
	ValueForm         float64   `gorm:"size:10"`
	Form              string    `gorm:"size:10"`
	TotalPoints       int       `gorm:"not null"`
	CreatedAt         time.Time `gorm:"CreatedAt" json:"-"`
	UpdatedAt         time.Time `gorm:"UpdatedAt" json:"-"`
	PrettyUpdatedAt   string    `gorm:"-" json:"UpdatedAt"`
}

func (Player) TableName() string {
	return "Players"
}
