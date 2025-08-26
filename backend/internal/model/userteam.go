package model

type UserTeam struct {
	ID       uint   `gorm:"primaryKey"`
	UserName string `gorm:"not null"`
	Points   int
}
