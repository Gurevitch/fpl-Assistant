package model

import (
	"time"

	"gorm.io/datatypes"
)

type Chip struct {
	ID         uint           `gorm:"primaryKey"`
	Name       string         `gorm:"size:50;not null"`
	Number     int            `gorm:"not null"`
	StartEvent int            `gorm:"not null"`
	StopEvent  int            `gorm:"not null"`
	ChipType   string         `gorm:"size:32;not null"`
	Overrides  datatypes.JSON `gorm:"type:jsonb"` // stores rules/scoring/etc.
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"-"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"-"`
}
