package model

import "time"

type FplResponse struct {
	Teams   []FplTeam   `json:"teams"`
	Players []FplPlayer `json:"elements"`
	Chips   []FplChip   `json:"chips"`
}

type FplTeam struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	Code      int    `json:"code"`
}

// FplChip mirrors the FPL "chips" JSON
type FplChip struct {
	ID         int             `json:"id"`
	Name       string          `json:"name"`
	Number     int             `json:"number"`
	StartEvent int             `json:"start_event"`
	StopEvent  int             `json:"stop_event"`
	ChipType   string          `json:"chip_type"`
	Overrides  FplChipOverride `json:"overrides"`
}
type FplChipOverride struct {
	Rules          map[string]any `json:"rules"`           // usually empty or key:value (e.g. squad_squadsize)
	Scoring        map[string]any `json:"scoring"`         // usually empty
	ElementTypes   []int          `json:"element_types"`   // often []
	PickMultiplier *int           `json:"pick_multiplier"` // can be null
}
type FplPlayer struct {
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
	IctIndex          string  `json:"ict_index"`
}

type FplFixtureDTO struct {
	ID                   int        `json:"id"`
	Event                *int       `json:"event"`
	KickoffTime          *time.Time `json:"kickoff_time"`
	Started              bool       `json:"started"`
	Finished             bool       `json:"finished"`
	ProvisionalStartTime bool       `json:"provisional_start_time"`
	TeamA                int        `json:"team_a"`
	TeamAScore           *int       `json:"team_a_score"`
	TeamH                int        `json:"team_h"`
	TeamHScore           *int       `json:"team_h_score"`
	TeamADifficulty      int        `json:"team_a_difficulty"`
	TeamHDifficulty      int        `json:"team_h_difficulty"`
	Minutes              int        `json:"minutes"`
	PulseID              int        `json:"pulse_id"`
	Code                 int        `json:"code"`
}
