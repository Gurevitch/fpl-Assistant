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
	"gorm.io/gorm/clause"
)

const fplFixturesURL = "https://fantasy.premierleague.com/api/fixtures/?future=1"
const fplPlayersURL = "https://fantasy.premierleague.com/api/bootstrap-static/"

func ImportFPLData(ctx context.Context) error {
	resp, err := http.Get(fplPlayersURL)
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

	if err := ImportFixtures(ctx, db); err != nil {
		return fmt.Errorf("❌ insert fixtures failed: %w", err)
	}
	log.Println("✅ Fixtures imported")

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
			IctIndex:          p.IctIndex,
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
				existing.TotalPoints == player.TotalPoints &&
				existing.Form == player.Form &&
				existing.SelectedByPercent == player.SelectedByPercent &&
				existing.TransfersIn == player.TransfersIn &&
				existing.TransfersInEvent == player.TransfersInEvent &&
				existing.TransfersOut == player.TransfersOut &&
				existing.TransfersOutEvent == player.TransfersOutEvent &&
				existing.ValueForm == player.ValueForm &&
				existing.EventPoints == player.EventPoints &&
				existing.IctIndex == player.IctIndex {
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

func ImportFixtures(ctx context.Context, db *gorm.DB) error {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, fplFixturesURL, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch fixtures: %w", err)
	}
	defer resp.Body.Close()

	var rowsDTO []model.FplFixtureDTO
	if err := json.NewDecoder(resp.Body).Decode(&rowsDTO); err != nil {
		return fmt.Errorf("decode fixtures: %w", err)
	}

	rows := make([]model.Fixture, 0, len(rowsDTO))
	for _, fx := range rowsDTO {
		rows = append(rows, model.Fixture{
			ID:                   fx.ID,
			Event:                fx.Event,
			KickoffTime:          fx.KickoffTime,
			Started:              fx.Started,
			Finished:             fx.Finished,
			ProvisionalStartTime: fx.ProvisionalStartTime,
			TeamHID:              uint(fx.TeamH), // ← uses Team.ID you already saved
			TeamAID:              uint(fx.TeamA),
			TeamHScore:           fx.TeamHScore,
			TeamAScore:           fx.TeamAScore,
			TeamHDifficulty:      fx.TeamHDifficulty,
			TeamADifficulty:      fx.TeamADifficulty,
			Minutes:              fx.Minutes,
			PulseID:              fx.PulseID,
			Code:                 fx.Code,
		})
	}

	// Upsert on fixture ID so re-runs are safe
	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"event", "kickoff_time", "started", "finished", "provisional_start_time",
			"team_h_id", "team_a_id", "team_h_score", "team_a_score",
			"team_h_difficulty", "team_a_difficulty", "minutes", "pulse_id", "code",
		}),
	}).Create(&rows).Error
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
