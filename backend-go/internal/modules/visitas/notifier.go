// Package visitas implementa o CRUD de agendamento de visitas
// (`/api/visitas/*`). Ver docs/migration/06-dashboards-vendas-config.md
// §"Visitas".
package visitas

import "context"

// Notifier abstrai o efeito colateral de criação de Notificacao + emissão de
// evento em tempo real (Socket.io `notification:{userId}` no Node). O modelo
// `Notificacao` e o hub de WebSocket pertencem ao domínio realtime
// (docs/migration/05-whatsapp-realtime-jobs.md, módulo de outro agente) — este
// pacote NÃO os implementa, apenas declara a interface e usa um no-op por
// padrão. Substituir a implementação real no wiring (ver
// docs/migration/wiring/06-dashboards-vendas-config.md).
type Notifier interface {
	NotifyUser(ctx context.Context, userID uint, event string, payload map[string]interface{}) error
}

// NoopNotifier não faz nada — usado enquanto o hub de realtime não está
// disponível para injeção. Não falha a criação da visita.
type NoopNotifier struct{}

func (NoopNotifier) NotifyUser(ctx context.Context, userID uint, event string, payload map[string]interface{}) error {
	return nil
}
