package model

type Team struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"size:100;not null"`
	ShortName string `gorm:"size:10;not null"`
	Code      string `gorm:"size:10"`
}
