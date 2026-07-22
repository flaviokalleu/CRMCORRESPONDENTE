package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"

	"crmimob/internal/config"
)

// OpenContainer abre o sqlstore.Container do whatsmeow contra o MESMO Postgres
// usado pelo GORM (mesma DSN), mas com sua PRÓPRIA gestão de schema
// (`whatsmeow_*` tables via `container.Upgrade(ctx)` interno). Ver decisão de
// arquitetura documentada em internal/models/whatsapp_session.go.
//
// IMPORTANTE: isso é INDEPENDENTE do *gorm.DB da aplicação — o whatsmeow abre
// sua própria conexão via database/sql (driver pgx "postgres" registrado por
// jackc/pgx/v5/stdlib, já presente indiretamente no go.mod via gorm postgres
// driver). Se o driver "pgx" não estiver registrado como "postgres" no
// database/sql, trocar para "pgx" no dialect abaixo.
func OpenContainer(ctx context.Context, cfg *config.Config, logger waLog.Logger) (*sqlstore.Container, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DB.Host, cfg.DB.Port, cfg.DB.User, cfg.DB.Password, cfg.DB.Name, cfg.DB.SSLMode,
	)

	container, err := sqlstore.New(ctx, "postgres", dsn, logger)
	if err != nil {
		return nil, fmt.Errorf("whatsapp: abrir sqlstore: %w", err)
	}
	return container, nil
}

// NewDeviceForTenant cria um device NOVO e vazio (ainda não pareado) — usado
// quando um tenant nunca conectou ou pediu reset/nova sessão. Equivalente a
// `initAuthCreds()` / `container.NewDevice()` do mapa de-para do spec.
func NewDeviceForTenant(container *sqlstore.Container) *store.Device {
	return container.NewDevice()
}

// LoadDevice tenta reidratar um device já pareado a partir do JID salvo em
// whatsapp_sessions.device_jid (ver SessionRepo.SaveDeviceJID). Retorna
// (nil, nil) se não encontrado (o caller deve então criar um device novo e
// pedir novo QR).
func LoadDevice(ctx context.Context, container *sqlstore.Container, jidStr string) (*store.Device, error) {
	jid, err := types.ParseJID(jidStr)
	if err != nil {
		return nil, fmt.Errorf("whatsapp: JID inválido %q: %w", jidStr, err)
	}
	dev, err := container.GetDevice(ctx, jid)
	if err != nil {
		return nil, fmt.Errorf("whatsapp: carregar device: %w", err)
	}
	return dev, nil
}
