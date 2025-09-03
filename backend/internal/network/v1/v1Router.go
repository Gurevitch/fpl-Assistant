package v1

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"bitbucket.org/Local/fpl-assistant/backend/internal/ai"
	"bitbucket.org/Local/fpl-assistant/backend/internal/fplimporter"
	"bitbucket.org/Local/fpl-assistant/backend/internal/model"
	"bitbucket.org/Local/fpl-assistant/backend/internal/repository"
	"github.com/go-chi/chi"
)

type askReq struct {
	Message string `json:"message"`
}

func NewV1Router() chi.Router {
	r := chi.NewRouter()

	r.Post("/admin/import-fpl", ImportFPLHandler)
	r.Post("/ask-ai", AskAIHandler)

	r.Get("/players", GetAllPlayers)
	r.Get("/teams", GetAllTeams)
	r.Get("/fixtures", GetAllFixtures)

	return r
}

func ImportFPLHandler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	if err := fplimporter.ImportFPLData(ctx); err != nil {
		log.Printf("❌ Import failed: %v", err)
		http.Error(w, "Failed to import FPL data", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("✅ FPL data imported successfully."))
}

func GetAllPlayers(w http.ResponseWriter, r *http.Request) {
	var players []model.Player
	if err := repository.DB.Find(&players).Error; err != nil {
		http.Error(w, "Failed to fetch players", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(players)
}

func GetAllTeams(w http.ResponseWriter, r *http.Request) {
	var teams []model.Team
	if err := repository.DB.Find(&teams).Error; err != nil {
		http.Error(w, "Failed to fetch players", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(teams)
}
func GetAllFixtures(w http.ResponseWriter, r *http.Request) {
	var fixtures []model.Fixture
	if err := repository.DB.Find(&fixtures).Error; err != nil {
		http.Error(w, "Failed to fetch players", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fixtures)
}
func AskAIHandler(w http.ResponseWriter, r *http.Request) {
	var req askReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Message == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	reply, err := ai.CallGemini(ctx, req.Message)
	if err != nil {
		http.Error(w, "Gemini API failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"reply": reply})
}
