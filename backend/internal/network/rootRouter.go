package network

import (
	"net/http"

	v1 "bitbucket.org/Local/fpl-assistant/backend/internal/network/v1"
	"github.com/go-chi/chi"
)

func NewRouter() http.Handler {
	r := chi.NewRouter()

	// Mount API versioned routes under /api/v1
	r.Route("/v1", func(r chi.Router) {
		r.Mount("/", v1.NewV1Router())
	})

	// Mount static file handler for React app (Vite)
	makeStaticFileHandler(r)

	return r
}
