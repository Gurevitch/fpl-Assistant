package model

import "time"

type Gameweek struct {
	ID          uint      `gorm:"primaryKey"`
	Number      int       `gorm:"not null;unique"`
	DeadlineUTC time.Time `gorm:"not null"`
	IsCurrent   bool
	IsFinished  bool
}
