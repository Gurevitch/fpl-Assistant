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

type fplResponse struct {
	Teams   []fplTeam   `json:"teams"`
	Players []fplPlayer `json:"elements"`
	Chips   []fplChip   `json:"chips"`
}

type fplTeam struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	Code      int    `json:"code"`
}

// fplChip mirrors the FPL "chips" JSON
type fplChip struct {
	ID         int             `json:"id"`
	Name       string          `json:"name"`
	Number     int             `json:"number"`
	StartEvent int             `json:"start_event"`
	StopEvent  int             `json:"stop_event"`
	ChipType   string          `json:"chip_type"`
	Overrides  fplChipOverride `json:"overrides"`
}
type fplChipOverride struct {
	Rules          map[string]any `json:"rules"`           // usually empty or key:value (e.g. squad_squadsize)
	Scoring        map[string]any `json:"scoring"`         // usually empty
	ElementTypes   []int          `json:"element_types"`   // often []
	PickMultiplier *int           `json:"pick_multiplier"` // can be null
}
type fplPlayer struct {
	ID                int     `json:"id"`
	FirstName         string  `json:"first_name"`
	SecondName        string  `json:"second_name"`
	Team              int     `json:"team"`
	NowCost           float64 `json:"now_cost"`
	TotalPoints       int     `json:"total_points"`
	ElementType       int     `json:"element_type"`
	SelectedByPercent string  `json:"selected_by_percent"`
	TransfersIn       int     `json:"transfers_in"`
	TransfersInEvent  int     `json:"transfers_in_event"`
	TransfersOut      int     `json:"transfers_out"`
	TransfersOutEvent int     `json:"transfers_out_event"`
	ValueForm         string  `json:"value_form"`
	Form              string  `json:"form"`
	WebName           string  `json:"web_name"`
	EventPoints       int     `json:"event_points"`
}

func ImportFPLData(ctx context.Context) error {
	resp, err := http.Get("https://fantasy.premierleague.com/api/bootstrap-static/")
	if err != nil {
		return fmt.Errorf("❌ failed to fetch FPL data: %w", err)
	}
	defer resp.Body.Close()

	var data fplResponse
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
func importPlayers(db *gorm.DB, players []fplPlayer) error {
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
func importChips(db *gorm.DB, chips []fplChip) error {
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
