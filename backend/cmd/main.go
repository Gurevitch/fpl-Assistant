package main

import (
	"context"
	"log"
	"net/http"

	"bitbucket.org/Local/fpl-assistant/backend/internal/config"
	"bitbucket.org/Local/fpl-assistant/backend/internal/network"
	"bitbucket.org/Local/fpl-assistant/backend/internal/repository"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("⚠️ Could not load .env file: %v", err)
	}

	// Create application context
	ctx := context.Background()
	// Load configuration
	cfg := config.LoadConfig()
	// Initialize database
	repository.InitDB(ctx, &cfg.Database)

	// Set up router and start server
	router := network.NewRouter()

	log.Println("🚀 Server running at http://localhost:8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("❌ Server crashed: %v", err)
	}
}
