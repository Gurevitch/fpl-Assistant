package network

import (
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"

	"github.com/go-chi/chi"
)

func makeStaticFileHandler(r *chi.Mux) {
	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("❌ Failed to get working directory: %v", err)
		return
	}

	projectRoot := filepath.Join(currentDir, "..", "..")
	clientBuildDir := path.Join(projectRoot, "frontend", "build")
	clientStaticDir := path.Join(clientBuildDir, "static") // CRA uses /static

	// Serve static files
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir(clientStaticDir))))

	// Serve index.html for root
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, path.Join(clientBuildDir, "index.html"))
	})

	// Fallback for SPA routes
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, path.Join(clientBuildDir, "index.html"))
	})
}
