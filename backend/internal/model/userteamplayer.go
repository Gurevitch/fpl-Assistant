package model

type UserTeamPlayer struct {
	ID         uint `gorm:"primaryKey"`
	UserTeamID uint `gorm:"not null"` // FK to UserTeam
	PlayerID   uint `gorm:"not null"` // FK to Player
	IsCaptain  bool
	IsVice     bool
	IsStarting bool
}
