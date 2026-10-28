package main

import (
	"errors"
	"flag"
	"log"
	"net/http"
	"time"
)

func main() {
	seedPath := flag.String("seed", "data/seed_issues.json", "initial issue seed file")
	dataPath := flag.String("data", "data/issues.json", "runtime JSON data file")
	flag.Parse()

	store, err := NewStore(*seedPath, *dataPath)
	if err != nil {
		log.Fatalf("initialize issue store: %v", err)
	}

	server := &http.Server{
		Addr:              "127.0.0.1:8080",
		Handler:           NewAPI(store, DefaultAllowedOrigins()),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("UNITY-INSPECT API listening on http://%s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func DefaultAllowedOrigins() []string {
	return []string{
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:4173",
		"http://127.0.0.1:4173",
	}
}
