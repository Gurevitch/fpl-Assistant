package fplimporter

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"bitbucket.org/Local/fpl-assistant/backend/internal/model"
	"bitbucket.org/Local/fpl-assistant/backend/internal/repository"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func ImportFPLData(ctx context.Context) error {
	resp, err := http.Get("https://fantasy.premierleague.com/api/bootstrap-static/")
	if err != nil {
		return fmt.Errorf("❌ failed to fetch FPL data: %w", err)
	}
	defer resp.Body.Close()

	var data model.FplResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return fmt.Errorf("❌ failed to decode response: %w", err)
	}

	db := repository.DB

	for _, t := range data.Teams {
		team := model.Team{
			ID:        uint(t.ID),
			Name:      t.Name,
			ShortName: t.ShortName,
			Code:      fmt.Sprintf("%d", t.Code),
		}
		if err := db.Save(&team).Error; err != nil {
			return fmt.Errorf("❌ insert team failed: %w", err)
		}
	}
	log.Println("✅ Teams imported")

	err = importPlayers(db, data.Players)
	if err != nil {
		return fmt.Errorf("❌ insert players failed: %w", err)
	}

	log.Println("✅ Players imported")

	if err := importChips(db, data.Chips); err != nil {
		return fmt.Errorf("❌ insert chips failed: %w", err)
	}
	log.Println("✅ Chips imported")

	return nil
}

func importPlayers(db *gorm.DB, players []model.FplPlayer) error {
	for _, p := range players {
		currentPrice := p.NowCost / 10.0
		selectedPercent, _ := strconv.ParseFloat(p.SelectedByPercent, 64)
		valueForm, _ := strconv.ParseFloat(p.ValueForm, 64)

		player := model.Player{
			ID:                uint(p.ID),
			FirstName:         p.FirstName,
			LastName:          p.SecondName,
			TeamID:            uint(p.Team),
			Position:          mapPosition(p.ElementType),
			StartPrice:        currentPrice,
			CurrentPrice:      currentPrice,
			TotalPoints:       p.TotalPoints,
			Form:              p.Form,
			SelectedByPercent: selectedPercent,
			TransfersIn:       p.TransfersIn,
			TransfersInEvent:  p.TransfersInEvent,
			TransfersOut:      p.TransfersOut,
			TransfersOutEvent: p.TransfersOutEvent,
			WebName:           p.WebName,
			ValueForm:         valueForm,
			EventPoints:       p.EventPoints,
			UpdatedAt:         time.Now(),
			CreatedAt:         time.Now(),
		}

		var existing model.Player
		err := db.First(&existing, player.ID).Error

		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("❌ failed to lookup player: %w", err)
		}

		if err == nil {
			// Keep original start price
			player.StartPrice = existing.StartPrice

			// Check if any tracked fields changed
			if existing.TeamID == player.TeamID &&
				existing.Position == player.Position &&
				existing.CurrentPrice == player.CurrentPrice &&
				existing.TotalPoints == player.TotalPoints {
				continue // ✅ Skip if unchanged
			}

			if err := db.Save(&player).Error; err != nil {
				return fmt.Errorf("❌ failed to update player: %w", err)
			}
			log.Printf("🔁 Updated: %s %s", player.FirstName, player.LastName)
		} else {
			if err := db.Create(&player).Error; err != nil {
				return fmt.Errorf("❌ failed to insert player: %w", err)
			}
			log.Printf("➕ Inserted: %s %s", player.FirstName, player.LastName)
		}
	}
	return nil
}
func importChips(db *gorm.DB, chips []model.FplChip) error {
	for _, c := range chips {
		ovBytes, err := json.Marshal(c.Overrides)
		if err != nil {
			return fmt.Errorf("marshal overrides: %w", err)
		}
		row := model.Chip{
			ID:         uint(c.ID),
			Name:       c.Name,
			Number:     c.Number,
			StartEvent: c.StartEvent,
			StopEvent:  c.StopEvent,
			ChipType:   c.ChipType,
			CreatedAt:  time.Now(),
			Overrides:  datatypes.JSON(ovBytes),
		}
		if err := db.Save(&row).Error; err != nil {
			return err
		}
	}
	return nil
}
func mapPosition(elementType int) string {
	switch elementType {
	case 1:
		return "GK"
	case 2:
		return "DEF"
	case 3:
		return "MID"
	case 4:
		return "FWD"
	default:
		return "UNK"
	}
}
