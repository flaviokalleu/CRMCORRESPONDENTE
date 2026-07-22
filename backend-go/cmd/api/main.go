package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"crmimob/internal/config"
	"crmimob/internal/database"
	"crmimob/internal/integrations/whatsapp"
	"crmimob/internal/jobs"
	"crmimob/internal/server"
	"crmimob/internal/ws"

	waLog "go.mau.fi/whatsmeow/util/log"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("falha ao carregar config", "error", err)
		os.Exit(1)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		slog.Error("falha ao conectar no banco", "error", err)
		os.Exit(1)
	}
	slog.Info("banco conectado", "host", cfg.DB.Host, "db", cfg.DB.Name)

	// ---- Realtime (substitui getSocketIO()) ----
	hub := ws.NewHub()

	// ---- WhatsApp (whatsmeow) — falha ao conectar no store não derruba o boot,
	// só desativa o cluster de WhatsApp (equivalente ao comportamento tolerante do Node) ----
	var waMgr *whatsapp.Manager
	var waRepo *whatsapp.SessionRepo
	ctx := context.Background()
	waLogger := waLog.Stdout("WhatsApp", "INFO", !cfg.IsProduction())
	if container, err := whatsapp.OpenContainer(ctx, cfg, waLogger); err != nil {
		slog.Warn("whatsapp desativado: falha ao abrir store", "error", err)
	} else {
		waRepo = whatsapp.NewSessionRepo(db)
		waMgr = whatsapp.NewManager(cfg, container, waRepo, hub, waLogger)
		waMgr.RestoreOnBoot(ctx)
		slog.Info("whatsapp manager iniciado")
	}

	// ---- Jobs / cron — dependências reais são injetadas conforme os módulos
	// de negócio forem plugados; nil é seguro (cada job faz nil-check) ----
	sched := jobs.New(jobs.Deps{
		WhatsApp:           waMgr,
		DefaultPhoneNumber: os.Getenv("DEFAULT_PHONE_NUMBER"),
	})
	sched.Start()
	defer sched.Stop()

	router := server.New(cfg, db, server.Deps{WhatsApp: waMgr, WhatsAppRepo: waRepo, Hub: hub})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("servidor iniciado", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("erro no servidor", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("encerrando...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown forçado", "error", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}
	slog.Info("encerrado")
}
