package model

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
}
