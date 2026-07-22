// Package propostas implementa o CRUD de negociação imobiliária
// (`/api/propostas/*`). Ver docs/migration/06-dashboards-vendas-config.md
// §"Propostas".
package propostas

import "context"

// Notifier abstrai a criação de Notificacao na criação de uma proposta (sem
// Socket.io, ao contrário de visitas). O modelo `Notificacao` pertence ao
// domínio realtime (outro agente/módulo) — ver
// docs/migration/wiring/06-dashboards-vendas-config.md.
type Notifier interface {
	NotifyUser(ctx context.Context, userID uint, event string, payload map[string]interface{}) error
}

// NoopNotifier não faz nada — usado enquanto o hub de notificações não está
// disponível para injeção.
type NoopNotifier struct{}

func (NoopNotifier) NotifyUser(ctx context.Context, userID uint, event string, payload map[string]interface{}) error {
	return nil
}
