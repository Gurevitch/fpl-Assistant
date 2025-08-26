package v1

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"bitbucket.org/Local/fpl-assistant/backend/internal/ai"
	"bitbucket.org/Local/fpl-assistant/backend/internal/fplimporter"
	"bitbucket.org/Local/fpl-assistant/backend/internal/model"
	"bitbucket.org/Local/fpl-assistant/backend/internal/repository"
	"github.com/go-chi/chi"
)

func NewV1Router() chi.Router {
	r := chi.NewRouter()

	r.Post("/admin/import-fpl", ImportFPLHandler)
	r.Post("/ask-ai", AskGeminiHandler)

	r.Get("/players", GetAllPlayers)
	r.Get("/teams", GetAllTeams)

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

func AskGeminiHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	resp, err := ai.CallGemini(req.Message)
	if err != nil {
		http.Error(w, "Gemini API failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"reply": resp})
}
